#!/usr/bin/env python3
"""
Immediately populate market data without waiting for Celery schedule.
Run this once to initialize the trending and gainers/losers data.

Usage:
    python populate_market_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, TrendingCoin, TopGainerLoser, Top100
from pycoingecko import CoinGeckoAPI
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s'
)
logger = logging.getLogger(__name__)

def create_tables():
    """Ensure all tables exist"""
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Tables created/verified")

def populate_trending():
    """Fetch and store trending coins"""
    db = SessionLocal()
    try:
        logger.info("\n" + "="*60)
        logger.info("FETCHING TRENDING COINS")
        logger.info("="*60)
        
        cg = CoinGeckoAPI()
        trending_data = cg.get_search_trending()
        
        if not trending_data or 'coins' not in trending_data:
            logger.error("No trending data returned")
            return False
        
        coins_list = trending_data.get('coins', [])
        
        if not coins_list:
            logger.error("No trending coins returned")
            return False
        
        # Clear existing
        db.query(TrendingCoin).delete()
        db.commit()
        
        added = 0
        for idx, item in enumerate(coins_list[:15], start=1):
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
                logger.info(f"  {idx}. {coin_data.get('symbol', 'N/A').upper()} - {coin_data.get('name', 'N/A')}")
                
            except Exception as e:
                logger.error(f"Error adding coin {idx}: {e}")
                continue
        
        db.commit()
        logger.info(f"\n✓ Added {added} trending coins")
        return True
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        db.rollback()
        return False
    finally:
        db.close()

def populate_gainers_losers():
    """Fetch and store top gainers and losers using free tier API"""
    db = SessionLocal()
    try:
        logger.info("\n" + "="*60)
        logger.info("FETCHING TOP GAINERS & LOSERS")
        logger.info("="*60)
        
        cg = CoinGeckoAPI()
        
        # Fetch top 250 coins by market cap with price change data
        # This endpoint is available in the free tier
        logger.info("Fetching market data from CoinGecko...")
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
            return False
        
        logger.info(f"Received {len(market_data)} coins from CoinGecko")
        
        # Filter out coins without price change data
        coins_with_changes = [
            coin for coin in market_data 
            if coin.get('price_change_percentage_24h') is not None
        ]
        
        if not coins_with_changes:
            logger.error("No coins with 24h price change data")
            return False
        
        logger.info(f"Found {len(coins_with_changes)} coins with price change data")
        
        # Sort by price change percentage
        sorted_by_change = sorted(
            coins_with_changes,
            key=lambda x: x.get('price_change_percentage_24h', 0),
            reverse=True
        )
        
        # Get top 10 gainers and bottom 10 losers
        top_gainers = sorted_by_change[:10]
        top_losers = sorted_by_change[-10:]
        
        # Clear existing
        db.query(TopGainerLoser).delete()
        db.commit()
        
        added_gainers = 0
        added_losers = 0
        
        # Process gainers
        logger.info("\nTop Gainers:")
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
                added_gainers += 1
                logger.info(f"  ↑ {gainer.get('symbol', 'N/A').upper()}: +{gainer.get('price_change_percentage_24h', 0):.2f}%")
            except Exception as e:
                logger.error(f"Error adding gainer: {e}")
                continue
        
        # Process losers
        logger.info("\nTop Losers:")
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
                added_losers += 1
                logger.info(f"  ↓ {loser.get('symbol', 'N/A').upper()}: {loser.get('price_change_percentage_24h', 0):.2f}%")
            except Exception as e:
                logger.error(f"Error adding loser: {e}")
                continue
        
        db.commit()
        logger.info(f"\n✓ Added {added_gainers} gainers and {added_losers} losers")
        return True
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        db.rollback()
        return False
    finally:
        db.close()

def verify_data():
    """Verify data was populated"""
    db = SessionLocal()
    try:
        logger.info("\n" + "="*60)
        logger.info("VERIFICATION")
        logger.info("="*60)
        
        trending_count = db.query(TrendingCoin).count()
        gainers_count = db.query(TopGainerLoser).filter_by(is_gainer=True).count()
        losers_count = db.query(TopGainerLoser).filter_by(is_gainer=False).count()
        
        logger.info(f"Trending Coins: {trending_count}")
        logger.info(f"Top Gainers: {gainers_count}")
        logger.info(f"Top Losers: {losers_count}")
        
        if trending_count > 0 and gainers_count > 0 and losers_count > 0:
            logger.info("\n✓ ALL DATA POPULATED SUCCESSFULLY!")
            logger.info("\nYou can now:")
            logger.info("1. Refresh your frontend")
            logger.info("2. Navigate to Markets tab")
            logger.info("3. Click on Trending or Gainers & Losers tabs")
            return True
        else:
            logger.warning("\n⚠ Some data missing")
            return False
            
    finally:
        db.close()

def populate_top_100():
    coins = [
        ("bitcoin", "btc"),
        ("ethereum", "eth"),
        ("tether", "usdt"),
        ("binancecoin", "bnb"),
        ("ripple", "xrp"),
        ("solana", "sol"),
        ("usd-coin", "usdc"),
        ("lido-staked-ether", "steth"),
        ("tron", "trx"),
        ("dogecoin", "doge"),
        ("cardano", "ada"),
        ("wrapped-steth", "wsteth"),
        ("wrapped-bitcoin", "wbtc"),
        ("wrapped-beacon-eth", "wbeth"),
        ("figure-heloc", "figr_heloc"),
        ("chainlink", "link"),
        ("ethena-usde", "usde"),
        ("wrapped-eeth", "weeth"),
        ("stellar", "xlm"),
        ("hyperliquid", "hype"),
        ("bitcoin-cash", "bch"),
        ("sui", "sui"),
        ("usds", "usds"),
        ("binance-bridged-usdt-bnb-smart-chain", "bsc-usd"),
        ("avalanche-2", "avax"),
        ("weth", "weth"),
        ("leo-token", "leo"),
        ("coinbase-wrapped-btc", "cbbtc"),
        ("hedera-hashgraph", "hbar"),
        ("litecoin", "ltc"),
        ("shiba-inu", "shib"),
        ("whitebit", "wbt"),
        ("monero", "xmr"),
        ("mantle", "mnt"),
        ("toncoin", "ton"),
        ("cronos", "cro"),
        ("ethena-staked-usde", "susde"),
        ("polkadot", "dot"),
        ("dai", "dai"),
        ("zcash", "zec"),
        ("uniswap", "uni"),
        ("bittensor", "tao"),
        ("world-liberty-financial", "wlfi"),
        ("memecore", "m"),
        ("aave", "aave"),
        ("susds", "susds"),
        ("okb", "okb"),
        ("bitget-token", "bgb"),
        ("ethena", "ena"),
        ("pepe", "pepe"),
        ("near", "near"),
        ("blackrock-usd-institutional-digital-liquidity-fund", "buidl"),
        ("jito-staked-sol", "jitosol"),
        ("paypal-usd", "pyusd"),
        ("ethereum-classic", "etc"),
        ("ondo-finance", "ondo"),
        ("aptos", "apt"),
        ("algorand", "algo"),
        ("cosmos", "atom"),
        ("kaspa", "kas"),
        ("aave", "aave"),
        ("quant", "qnt"),
        ("pax-gold", "paxg"),
        ("flare", "flr"),
        ("render-token", "render"),
        ("kucoin-shares", "kcs"),
        ("vechain", "vet"),
        ("pudgy-penguins", "pengu"),
        ("arbitrum", "arb"),
        ("tether-gold", "xaut"),
        ("worldcoin-wld", "wld"),
        ("internet-computer", "icp"),
        ("pumpdotfun", "pump"),
        ("sky", "sky"),
        ("lombard-staked-btc", "lbtc"),
        ("renzo-restaked-eth", "ezeth"),
        ("sei-network", "sei"),
        ("official-trump", "trump"),
    ]

    db = SessionLocal()
    for cid, sym in coins:
        db.add(Top100(coin_id=cid, symbol=sym))
    db.commit()
    db.close()

def main():
    """Main execution"""
    logger.info("="*60)
    logger.info("MARKET DATA POPULATION")
    logger.info("="*60)
    
    try:
        # Create tables
        create_tables()
        populate_top_100()  
        # Populate trending
        trending_ok = populate_trending()
        
        # Populate gainers/losers
        gainers_ok = populate_gainers_losers()
        
        # Verify
        verify_ok = verify_data()
        
        if trending_ok and gainers_ok and verify_ok:
            logger.info("\n" + "="*60)
            logger.info("SUCCESS - Market data ready!")
            logger.info("="*60)
            return 0
        else:
            logger.warning("\n" + "="*60)
            logger.warning("COMPLETED WITH WARNINGS")
            logger.warning("="*60)
            return 1
            
    except KeyboardInterrupt:
        logger.info("\n\nInterrupted by user")
        return 1
    except Exception as e:
        logger.error(f"\nFATAL ERROR: {e}", exc_info=True)
        return 1

if __name__ == "__main__":
    exit(main())