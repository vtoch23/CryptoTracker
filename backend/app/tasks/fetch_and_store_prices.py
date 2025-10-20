from app.database import SessionLocal
from app.models import PricePoint, Coin, WatchlistItem, User
import datetime
from celery import shared_task
import logging
from pycoingecko import CoinGeckoAPI

logger = logging.getLogger(__name__)

@shared_task(name="app.tasks.update_coins_list")
def update_coins_list():
    """
    Update the Coins table with all available coins from CoinGecko.
    Run once a week.
    """
    db = SessionLocal()
    try:
        cg = CoinGeckoAPI()
        logger.info("Fetching coins list from CoinGecko...")
        coin_list = cg.get_coins_list()
        
        if not coin_list:
            logger.error("No coins returned from CoinGecko")
            return {"status": "error", "message": "No coins from API"}
        
        # Clear existing coins and insert new ones
        db.query(Coin).delete()
        db.commit()
        
        added_count = 0
        for coin in coin_list:
            try:
                db.add(Coin(
                    coin_id=coin["id"],
                    symbol=coin["symbol"].upper()
                ))
                added_count += 1
            except Exception as e:
                logger.warning(f"Error adding coin {coin.get('id')}: {e}")
                continue
        
        db.commit()
        
        logger.info(f"Successfully updated {added_count} coins in database")
        return {"status": "success", "coins_count": added_count}
        
    except Exception as e:
        logger.error(f"Error updating coins list: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@shared_task(name="app.tasks.fetch_and_store_prices")
def fetch_and_store_prices():
    """
    Fetch prices from CoinGecko for all coins in users' watchlists.
    Store prices in price_points table for persistence.
    Runs periodically (e.g., every 5 minutes).
    """
    db = SessionLocal()
    try:
        # Get all unique coin_ids from watchlist
        watchlist_coins = (
            db.query(WatchlistItem.coin_id)
            .distinct()
            .filter(WatchlistItem.coin_id.isnot(None))
            .all()
        )
        
        if not watchlist_coins:
            logger.info("No coins in any watchlist")
            return {"status": "success", "symbols": 0}
        
        coin_ids = [c[0] for c in watchlist_coins]
        logger.info(f"Fetching prices for {len(coin_ids)} coins from watchlist")
        
        # Get symbol mapping from Coin table
        coins = db.query(Coin).all()
        coin_id_to_symbol = {c.coin_id: c.symbol for c in coins}
        
        # Fetch prices in batches from CoinGecko
        batch_size = 250
        all_prices = {}
        
        cg = CoinGeckoAPI()
        
        for i in range(0, len(coin_ids), batch_size):
            batch = coin_ids[i:i + batch_size]
            ids_str = ",".join(batch)
            
            try:
                logger.info(f"Fetching batch {i//batch_size + 1}/{(len(coin_ids) + batch_size - 1)//batch_size}...")
                
                response = cg.get_price(
                    ids=ids_str,
                    vs_currencies="usd",
                    include_market_cap=False,
                    include_24hr_vol=False,
                    include_last_updated_at=False
                )
                
                all_prices.update(response)
                logger.info(f"Batch {i//batch_size + 1} returned {len(response)} prices")
                
            except Exception as e:
                logger.error(f"Error fetching batch {i//batch_size}: {e}")
                continue
        
        if not all_prices:
            logger.warning("No prices returned from CoinGecko")
            return {"status": "error", "message": "No prices from API"}
        
        # Insert price points
        timestamp = datetime.datetime.utcnow()
        prices_added = 0
        
        for coin_id, price_data in all_prices.items():
            if coin_id in price_data and "usd" in price_data[coin_id]:
                symbol = coin_id_to_symbol.get(coin_id, coin_id.upper())
                price = float(price_data[coin_id]["usd"])
                
                db.add(PricePoint(
                    symbol=symbol,
                    price=price,
                    timestamp=timestamp
                ))
                prices_added += 1
            else:
                logger.warning(f"No price data for {coin_id}")
        
        db.commit()
        logger.info(f"Prices updated at {timestamp.isoformat()}: {prices_added} coins stored")
        return {"status": "success", "symbols": prices_added, "timestamp": timestamp.isoformat()}
        
    except Exception as e:
        logger.error(f"Error fetching prices: {e}", exc_info=True)
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()