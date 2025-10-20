from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from app import models, schemas, dependencies
from pycoingecko import CoinGeckoAPI
import logging
from sqlalchemy import func

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/", response_model=List[schemas.PricePointOut])
@router.get("", response_model=List[schemas.PricePointOut])  # Handle both with/without trailing slash
def get_latest_prices(db: Session = Depends(dependencies.get_db)):
    """
    Returns current prices for all watched coins from database.
    Fetches latest price point for each symbol in watchlist.
    """
    try:
        logger.info("=== GET LATEST PRICES ===")
        
        # Get all unique symbols from watchlist
        watchlist_symbols = (
            db.query(models.WatchlistItem.symbol)
            .distinct()
            .filter(models.WatchlistItem.symbol.isnot(None))
            .all()
        )
        
        if not watchlist_symbols:
            logger.info("No coins in watchlist")
            return []
        
        symbols = [s[0] for s in watchlist_symbols]
        logger.info(f"Watchlist has {len(symbols)} unique symbols: {symbols}")
        
        # Get the latest price for each symbol
        subquery = (
            db.query(
                models.PricePoint.symbol,
                func.max(models.PricePoint.id).label("max_id")
            )
            .filter(models.PricePoint.symbol.in_(symbols))
            .group_by(models.PricePoint.symbol)
            .subquery()
        )
        
        latest_prices = (
            db.query(models.PricePoint)
            .join(
                subquery,
                (models.PricePoint.symbol == subquery.c.symbol) &
                (models.PricePoint.id == subquery.c.max_id)
            )
            .all()
        )
        
        if not latest_prices:
            logger.warning("No prices in database for watchlist symbols")
            return []
        
        logger.info(f"Returning {len(latest_prices)} prices from database")
        return latest_prices
        
    except Exception as e:
        logger.error(f"Error in get_latest_prices: {e}", exc_info=True)
        # Return empty list instead of 500 error
        return []

@router.get("/{symbol}", response_model=List[schemas.PricePointOut])
def get_price_history(
    symbol: str,
    limit: Optional[int] = Query(100, description="Limit number of records"),
    db: Session = Depends(dependencies.get_db)
):
    """
    Returns price history for a symbol from database.
    """
    try:
        symbol = symbol.upper()
        
        logger.info(f"Getting price history for {symbol}, limit {limit}")
        
        prices = (
            db.query(models.PricePoint)
            .filter(models.PricePoint.symbol == symbol)
            .order_by(models.PricePoint.timestamp.desc())
            .limit(limit)
            .all()
        )
        
        if not prices:
            logger.info(f"No price history for {symbol}")
            return []
        
        logger.info(f"Returning {len(prices)} historical prices for {symbol}")
        return prices
        
    except Exception as e:
        logger.error(f"Error in get_price_history: {e}", exc_info=True)
        return []