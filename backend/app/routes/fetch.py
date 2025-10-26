from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import dependencies
from app.database import SessionLocal
from app.models import PricePoint, WatchlistItem, Coin
import httpx
import requests
import datetime
import sys
import os
from app.tasks.fetch_and_store_prices import fetch_and_store_prices
from app.worker.celery_app import celery_app

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from logging_config import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
    logging.basicConfig(level=logging.DEBUG)



router = APIRouter(prefix="/fetch", tags=["fetch"])

@router.get("/", status_code=200)
def refresh_prices(
    db: Session = Depends(dependencies.get_db)
    ):


    """
    Fetch live prices from CoinGecko for all watchlist coins.
    Stores prices in price_points table for persistence.
    Returns stored prices immediately.
    """
    try:
        logger.info("REFRESH PRICES STARTED")
        
        # Get all unique coin_ids from watchlist
        watchlist_coins = (
            db.query(WatchlistItem.coin_id, WatchlistItem.symbol)
            .distinct(WatchlistItem.coin_id)
            .filter(WatchlistItem.coin_id.isnot(None))
            .all()
        )
        
        logger.info(f"DEBUG: watchlist_coins query returned {len(watchlist_coins)} results")
        logger.info(f"DEBUG: watchlist_coins = {watchlist_coins}")
        
        if not watchlist_coins:
            logger.warning("No coins in watchlist")
            return {
                "status": "success",
                "message": "No coins in watchlist",
                "coins": [],
                "count": 0
            }
        
        coin_ids = [c[0] for c in watchlist_coins]
        symbol_map = {c[0]: c[1] for c in watchlist_coins}
        
        logger.info(f"DEBUG: Extracted coin_ids = {coin_ids}")
        logger.info(f"DEBUG: symbol_map = {symbol_map}")
        logger.info(f"Fetching prices for {len(coin_ids)} coins")
        
        # Fetch live prices from CoinGecko in batches using httpx directly
        batch_size = 10
        all_prices = {}
        
        for i in range(0, len(coin_ids), batch_size):
            batch = coin_ids[i:i + batch_size]
            ids_str = ",".join(batch)
            
            logger.info(f"Batch coin_ids: {batch}")
            logger.info(f"Batch ids_str: {ids_str}")
            
            try:
                url = f"{settings.COINGECKO_PRICE_URL}?ids={ids_str}&vs_currencies=usd"
                headers = {"x-cg-demo-api-key": settings.COINGECKO_API_KEY}

                logger.info(f"DEBUG: Full URL = {url}")
                logger.info(f"DEBUG: Sending request to CoinGecko...")

                response = requests.get(url, headers=headers)

                # response = httpx.get(url, timeout=30.0)
                logger.info(f"DEBUG: HTTP Status = {response.status_code}")
                
                batch_data = response.json()
                logger.info(f"DEBUG: Raw JSON response = {batch_data}")

                
                all_prices.update(batch_data)
                logger.info(f"DEBUG: Total prices collected so far = {len(all_prices)}")
                
            except Exception as e:
                logger.error(f"Error fetching batch {i//batch_size}: {e}", exc_info=True)
                continue
        

        logger.info(f"DEBUG: all_prices (final) = {all_prices}")
        logger.info(f"DEBUG: Total prices collected = {len(all_prices)}")
        
        if not all_prices:
            logger.error("CRITICAL: No prices received from CoinGecko!")
            return {
                "status": "error",
                "message": "No prices received from CoinGecko - check logs",
                "coins": [],
                "count": 0
            }
        
        # Store prices in database and prepare response
        timestamp = datetime.datetime.utcnow()
        stored_prices = []
        
        logger.info(f"\nProcessing prices for database storage...")
        for coin_id, price_data in all_prices.items():
            logger.info(f"Processing {coin_id}: {price_data}")
            
            if isinstance(price_data, dict) and "usd" in price_data:
                symbol = symbol_map.get(coin_id, coin_id.upper())
                price_raw = price_data["usd"]
                price = float(price_raw)
                
                logger.info(f"✓ {symbol} ({coin_id}): {price_raw} → {price}")
                
                # Add to database
                price_point = PricePoint(
                    symbol=symbol,
                    price=price,
                    timestamp=timestamp
                )
                db.add(price_point)
                
                stored_prices.append({
                    "symbol": symbol,
                    "price": price,
                    "coin_id": coin_id,
                    "timestamp": timestamp.isoformat()
                })
            else:
                logger.warning(f"✗ No USD price for {coin_id}: {price_data}")
        
        db.commit()
        
        logger.info(f"\n{'=' * 60}")
        logger.info(f"REFRESH PRICES COMPLETED")
        logger.info(f"{'=' * 60}")
        logger.info(f"✓ Stored {len(stored_prices)} prices in database")
        logger.info(f"Timestamp: {timestamp}")
        
        return {
            "status": "success",
            "message": f"Prices updated for {len(stored_prices)} coins",
            "coins": stored_prices,
            "count": len(stored_prices),
            "timestamp": timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in refresh_prices: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error refreshing prices: {str(e)}"
        )