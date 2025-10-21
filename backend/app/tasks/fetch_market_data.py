from app.database import SessionLocal
from app.models import TrendingCoin, TopGainerLoser
import datetime
from celery import shared_task
import logging
from pycoingecko import CoinGeckoAPI

logger = logging.getLogger(__name__)

@shared_task(name="app.tasks.fetch_trending_coins")
def fetch_trending_coins():
    """
    Fetch trending coins from CoinGecko API.
    Updates the trending_coins table.
    Runs every hour.
    """
    db = SessionLocal()
    try:
        logger.info("Fetching trending coins from CoinGecko...")
        cg = CoinGeckoAPI()
        
        # Get trending coins
        trending_data = cg.get_search_trending()
        
        if not trending_data or 'coins' not in trending_data:
            logger.error("No trending data returned from CoinGecko")
            return {"status": "error", "message": "No trending data"}
        
        coins_list = trending_data['coins']
        
        # Clear existing trending coins
        db.query(TrendingCoin).delete()
        db.commit()
        
        added_count = 0
        for idx, item in enumerate(coins_list[:15], start=1):  # Top 15
            try:
                coin_data = item.get('item', {})
                
                trending_coin = TrendingCoin(
                    coin_id=coin_data.get('id', ''),
                    coin_gecko_id=coin_data.get('coin_id', 0),
                    name=coin_data.get('name', ''),
                    symbol=coin_data.get('symbol', '').upper(),
                    market_cap_rank=coin_data.get('market_cap_rank', 0),
                    thumb=coin_data.get('thumb', ''),
                    price_btc=float(coin_data.get('price_btc', 0)),
                    rank=idx,
                    updated_at=datetime.datetime.utcnow()
                )
                
                db.add(trending_coin)
                added_count += 1
                logger.info(f"Added trending coin: {coin_data.get('symbol')} (rank {idx})")
                
            except Exception as e:
                logger.error(f"Error adding trending coin: {e}")
                continue
        
        db.commit()
        logger.info(f"Successfully updated {added_count} trending coins")
        return {"status": "success", "count": added_count}
        
    except Exception as e:
        logger.error(f"Error fetching trending coins: {e}", exc_info=True)
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


@shared_task(name="app.tasks.fetch_top_gainers_losers")
def fetch_top_gainers_losers():
    """
    Fetch top gainers and losers from CoinGecko API using free tier methods.
    Updates the top_gainers_losers table.
    Runs every hour.
    """
    db = SessionLocal()
    try:
        logger.info("Fetching top gainers and losers from CoinGecko (free tier)...")
        
        cg = CoinGeckoAPI()
        
        # Fetch top 250 coins by market cap with price change data
        # This is available in the free tier
        market_data = cg.get_coins_markets(
            vs_currency='usd',
            order='market_cap_desc',
            per_page=250,
            page=1,
            sparkline=False,
            price_change_percentage='24h'
        )
        
        if not market_data:
            logger.error("No market data returned from CoinGecko")
            return {"status": "error", "message": "No market data"}
        
        logger.info(f"Received {len(market_data)} coins from CoinGecko")
        
        # Filter out coins without price change data
        coins_with_changes = [
            coin for coin in market_data 
            if coin.get('price_change_percentage_24h') is not None
        ]
        
        if not coins_with_changes:
            logger.error("No coins with 24h price change data")
            return {"status": "error", "message": "No price change data"}
        
        # Sort by price change percentage
        sorted_by_change = sorted(
            coins_with_changes,
            key=lambda x: x.get('price_change_percentage_24h', 0),
            reverse=True
        )
        
        # Get top 10 gainers and bottom 10 losers
        top_gainers = sorted_by_change[:10]
        top_losers = sorted_by_change[-10:]
        
        # Clear existing data
        db.query(TopGainerLoser).delete()
        db.commit()
        
        added_gainers = 0
        added_losers = 0
        
        # Process top gainers
        logger.info("Processing top gainers...")
        for gainer in top_gainers:
            try:
                coin = TopGainerLoser(
                    coin_id=gainer.get('id', ''),
                    symbol=gainer.get('symbol', '').upper(),
                    name=gainer.get('name', ''),
                    image=gainer.get('image', ''),
                    market_cap_rank=gainer.get('market_cap_rank', 0) or 0,
                    current_price=float(gainer.get('current_price', 0) or 0),
                    price_change_percentage_24h=float(gainer.get('price_change_percentage_24h', 0) or 0),
                    is_gainer=True,
                    updated_at=datetime.datetime.utcnow()
                )
                db.add(coin)
                added_gainers += 1
                logger.info(f"Added top gainer: {gainer.get('symbol', 'N/A').upper()} (+{gainer.get('price_change_percentage_24h', 0):.2f}%)")
            except Exception as e:
                logger.error(f"Error adding gainer: {e}")
                continue
        
        # Process top losers
        logger.info("Processing top losers...")
        for loser in top_losers:
            try:
                coin = TopGainerLoser(
                    coin_id=loser.get('id', ''),
                    symbol=loser.get('symbol', '').upper(),
                    name=loser.get('name', ''),
                    image=loser.get('image', ''),
                    market_cap_rank=loser.get('market_cap_rank', 0) or 0,
                    current_price=float(loser.get('current_price', 0) or 0),
                    price_change_percentage_24h=float(loser.get('price_change_percentage_24h', 0) or 0),
                    is_gainer=False,
                    updated_at=datetime.datetime.utcnow()
                )
                db.add(coin)
                added_losers += 1
                logger.info(f"Added top loser: {loser.get('symbol', 'N/A').upper()} ({loser.get('price_change_percentage_24h', 0):.2f}%)")
            except Exception as e:
                logger.error(f"Error adding loser: {e}")
                continue
        
        db.commit()
        logger.info(f"Successfully updated {added_gainers} gainers and {added_losers} losers")
        return {
            "status": "success", 
            "gainers": added_gainers,
            "losers": added_losers
        }
        
    except Exception as e:
        logger.error(f"Error fetching gainers/losers: {e}", exc_info=True)
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()