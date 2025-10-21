from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, dependencies
from app.database import SessionLocal
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["market"])

@router.get("/trending")
def get_trending_coins(db: Session = Depends(dependencies.get_db)):
    """
    Get trending coins from database (updated hourly by celery task)
    """
    try:
        trending = db.query(models.TrendingCoin).order_by(models.TrendingCoin.rank).limit(15).all()
        
        if not trending:
            logger.warning("No trending coins in database")
            return []
        
        return [
            {
                "id": coin.coin_id,
                "coin_id": coin.coin_gecko_id,
                "name": coin.name,
                "symbol": coin.symbol,
                "market_cap_rank": coin.market_cap_rank,
                "thumb": coin.thumb,
                "price_btc": coin.price_btc
            }
            for coin in trending
        ]
    except Exception as e:
        logger.error(f"Error fetching trending coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-gainers-losers")
def get_top_gainers_losers(db: Session = Depends(dependencies.get_db)):
    """
    Get top gainers and losers from database (updated hourly by celery task)
    """
    try:
        # Get top gainers (ordered by price change descending)
        gainers = (
            db.query(models.TopGainerLoser)
            .filter(models.TopGainerLoser.is_gainer == True)
            .order_by(models.TopGainerLoser.price_change_percentage_24h.desc())
            .limit(10)
            .all()
        )
        
        # Get top losers (ordered by price change ascending)
        losers = (
            db.query(models.TopGainerLoser)
            .filter(models.TopGainerLoser.is_gainer == False)
            .order_by(models.TopGainerLoser.price_change_percentage_24h.asc())
            .limit(10)
            .all()
        )
        
        def format_coin(coin):
            return {
                "id": coin.coin_id,
                "symbol": coin.symbol,
                "name": coin.name,
                "image": coin.image,
                "market_cap_rank": coin.market_cap_rank,
                "price_change_percentage_24h": coin.price_change_percentage_24h,
                "current_price": coin.current_price
            }
        
        return {
            "top_gainers": [format_coin(coin) for coin in gainers],
            "top_losers": [format_coin(coin) for coin in losers]
        }
        
    except Exception as e:
        logger.error(f"Error fetching gainers/losers: {e}")
        raise HTTPException(status_code=500, detail=str(e))