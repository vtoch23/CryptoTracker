"""
Database initialization script.
Runs automatically on FastAPI startup to populate required data.
Idempotent - safe to run multiple times.
"""

import logging
import os
from datetime import datetime
from pycoingecko import CoinGeckoAPI
from app.database import SessionLocal, engine
from app.models import Coin, Top100, TrendingCoin, TopGainerLoser, CoinHistory, Base

logger = logging.getLogger(__name__)

# Top 100 coins to always have available
TOP_100_COINS = [
    ("bitcoin", "BTC"),
    ("ethereum", "ETH"),
    ("tether", "USDT"),
    ("binancecoin", "BNB"),
    ("ripple", "XRP"),
    ("solana", "SOL"),
    ("usd-coin", "USDC"),
    ("lido-staked-ether", "STETH"),
    ("tron", "TRX"),
    ("dogecoin", "DOGE"),
    ("cardano", "ADA"),
    ("wrapped-steth", "WSTETH"),
    ("wrapped-bitcoin", "WBTC"),
    ("wrapped-beacon-eth", "WBETH"),
    ("chainlink", "LINK"),
    ("ethena-usde", "USDE"),
    ("stellar", "XLM"),
    ("hyperliquid", "HYPE"),
    ("bitcoin-cash", "BCH"),
    ("sui", "SUI"),
    ("avalanche-2", "AVAX"),
    ("weth", "WETH"),
    ("leo-token", "LEO"),
    ("coinbase-wrapped-btc", "CBBTC"),
    ("hedera-hashgraph", "HBAR"),
    ("litecoin", "LTC"),
    ("shiba-inu", "SHIB"),
    ("monero", "XMR"),
    ("mantle", "MNT"),
    ("toncoin", "TON"),
    ("cronos", "CRO"),
    ("polkadot", "DOT"),
    ("dai", "DAI"),
    ("zcash", "ZEC"),
    ("uniswap", "UNI"),
    ("bittensor", "TAO"),
    ("aave", "AAVE"),
    ("okb", "OKB"),
    ("bitget-token", "BGB"),
    ("ethena", "ENA"),
    ("pepe", "PEPE"),
    ("near", "NEAR"),
    ("paypal-usd", "PYUSD"),
    ("ethereum-classic", "ETC"),
    ("ondo-finance", "ONDO"),
    ("aptos", "APT"),
    ("algorand", "ALGO"),
    ("cosmos", "ATOM"),
    ("kaspa", "KAS"),
    ("quant", "QNT"),
    ("pax-gold", "PAXG"),
    ("flare", "FLR"),
    ("render-token", "RENDER"),
    ("kucoin-shares", "KCS"),
    ("vechain", "VET"),
    ("pudgy-penguins", "PENGU"),
    ("arbitrum", "ARB"),
    ("tether-gold", "XAUT"),
    ("worldcoin-wld", "WLD"),
    ("internet-computer", "ICP"),
    ("pumpdotfun", "PUMP"),
    ("sky", "SKY"),
    ("lombard-staked-btc", "LBTC"),
    ("renzo-restaked-eth", "EZETH"),
    ("sei-network", "SEI"),
    ("official-trump", "TRUMP"),
]


def init_coins_table():
    """
    Populate the Coin table with all available coins from CoinGecko.
    Only fetches if table is empty.
    """
    db = SessionLocal()
    try:
        # Check if coins table already has data
        coin_count = db.query(Coin).count()
        if coin_count > 0:
            logger.info(f"✓ Coins table already populated with {coin_count} coins")
            return True
        
        logger.info("Fetching all coins from CoinGecko API...")
        cg = CoinGeckoAPI()
        coin_list = cg.get_coins_list()
        
        if not coin_list:
            logger.error("Failed to fetch coins from CoinGecko")
            return False
        
        logger.info(f"Inserting {len(coin_list)} coins into database...")
        
        for idx, coin in enumerate(coin_list):
            try:
                new_coin = Coin(
                    coin_id=coin["id"],
                    symbol=coin["symbol"].upper()
                )
                db.add(new_coin)
                
                if (idx + 1) % 500 == 0:
                    logger.info(f"  Progress: {idx + 1}/{len(coin_list)}")
                    
            except Exception as e:
                logger.warning(f"Skipped coin {coin.get('id')}: {e}")
                continue
        
        db.commit()
        logger.info(f"✓ Successfully inserted {len(coin_list)} coins")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing coins table: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def init_top100_table():
    """
    Populate the Top100 table with curated list.
    Replaces data if already exists.
    """
    db = SessionLocal()
    try:
        # Clear and repopulate
        db.query(Top100).delete()
        
        logger.info(f"Populating Top100 with {len(TOP_100_COINS)} coins...")
        
        for coin_id, symbol in TOP_100_COINS:
            try:
                db.add(Top100(coin_id=coin_id, symbol=symbol))
            except Exception as e:
                logger.warning(f"Skipped {coin_id}: {e}")
                continue
        
        db.commit()
        logger.info(f"✓ Top100 table initialized with {len(TOP_100_COINS)} coins")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing Top100 table: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def init_trending_coins():
    """
    Fetch trending coins from CoinGecko.
    Updates every startup to keep data fresh.
    """
    db = SessionLocal()
    try:
        logger.info("Fetching trending coins from CoinGecko...")
        
        cg = CoinGeckoAPI()
        trending_data = cg.get_search_trending()
        
        if not trending_data or 'coins' not in trending_data:
            logger.warning("No trending data available")
            return False
        
        coins_list = trending_data.get('coins', [])[:15]
        
        # Clear and repopulate
        db.query(TrendingCoin).delete()
        
        added = 0
        for idx, item in enumerate(coins_list, start=1):
            try:
                coin_data = item.get('item', {})
                
                trending = TrendingCoin(
                    coin_id=coin_data.get('id', ''),
                    coin_gecko_id=coin_data.get('coin_id', 0),
                    name=coin_data.get('name', ''),
                    symbol=coin_data.get('symbol', '').upper(),
                    market_cap_rank=coin_data.get('market_cap_rank', 0) or 0,
                    thumb=coin_data.get('thumb', ''),
                    price_btc=float(coin_data.get('price_btc', 0) or 0),
                    rank=idx,
                    updated_at=datetime.utcnow()
                )
                
                db.add(trending)
                added += 1
                
            except Exception as e:
                logger.warning(f"Skipped trending coin {idx}: {e}")
                continue
        
        db.commit()
        logger.info(f"✓ Trending coins initialized: {added} coins")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing trending coins: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def init_gainers_losers():
    """
    Fetch top gainers and losers from CoinGecko.
    Updates every startup to keep data fresh.
    """
    db = SessionLocal()
    try:
        logger.info("Fetching top gainers and losers from CoinGecko...")
        
        cg = CoinGeckoAPI()
        market_data = cg.get_coins_markets(
            vs_currency='usd',
            order='market_cap_desc',
            per_page=250,
            page=1,
            sparkline=False,
            price_change_percentage='24h'
        )
        
        if not market_data:
            logger.warning("No market data available")
            return False
        
        # Filter coins with price change data
        coins_with_changes = [
            coin for coin in market_data 
            if coin.get('price_change_percentage_24h') is not None
        ]
        
        if not coins_with_changes:
            logger.warning("No coins with 24h price change data")
            return False
        
        # Sort and get top/bottom
        sorted_by_change = sorted(
            coins_with_changes,
            key=lambda x: x.get('price_change_percentage_24h', 0),
            reverse=True
        )
        
        top_gainers = sorted_by_change[:10]
        top_losers = sorted_by_change[-10:]
        
        # Clear and repopulate
        db.query(TopGainerLoser).delete()
        
        added = 0
        
        # Add gainers
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
                    updated_at=datetime.utcnow()
                )
                db.add(coin)
                added += 1
            except Exception as e:
                logger.warning(f"Skipped gainer: {e}")
                continue
        
        # Add losers
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
                    updated_at=datetime.utcnow()
                )
                db.add(coin)
                added += 1
            except Exception as e:
                logger.warning(f"Skipped loser: {e}")
                continue
        
        db.commit()
        logger.info(f"✓ Gainers/Losers initialized: {added} total")
        return True
        
    except Exception as e:
        logger.error(f"Error initializing gainers/losers: {e}")
        db.rollback()
        return False
    finally:
        db.close()


def init_coin_history_table():
    """
    Create coin_history table if it doesn't exist.
    This is idempotent - safe to run multiple times.
    """
    try:
        logger.info("Creating coin_history table if not exists...")
        
        # Create only the CoinHistory table
        CoinHistory.__table__.create(bind=engine, checkfirst=True)
        
        logger.info("✓ CoinHistory table ready")
        return True
        
    except Exception as e:
        logger.error(f"Error creating coin_history table: {e}")
        return False


def initialize_database():
    """
    Run all initialization tasks.
    Call this from FastAPI startup event.
    
    DISABLED in Railway production to avoid startup delays and API rate limits.
    Run manually via CLI or admin endpoint if needed.
    """
    # Check if we're in Railway production
    is_railway = os.getenv("RAILWAY_ENVIRONMENT") is not None
    
    if is_railway:
        logger.info("Railway environment detected - skipping automatic database initialization")
        logger.info("Database tables will be created automatically on first use")
        logger.info("Run manual initialization via CLI if you need to populate reference data")
        return True
    
    logger.info("DATABASE INITIALIZATION STARTED")
    
    try:
        # Initialize tables in order
        init_coin_history_table()  # Create history table first
        # Commented out to avoid CoinGecko API calls on every startup
        # init_coins_table()
        # init_top100_table()
        # init_trending_coins()
        # init_gainers_losers()
        
        logger.info("DATABASE INITIALIZATION COMPLETE")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False