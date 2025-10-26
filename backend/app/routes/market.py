from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app import dependencies
from app.database import SessionLocal
from app.models import Top100, TopGainerLoser, TrendingCoin, User
from pycoingecko import CoinGeckoAPI
import logging
import time
from typing import Dict, Any, List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/market", tags=["market"])
cg = CoinGeckoAPI()

@router.get("/prices")
def get_top100_simple_prices() -> Dict[str, Dict[str, Any]]:
    db = SessionLocal()
    try:
        coins = db.query(Top100).all()
        if not coins:
            return {}

        ids_csv = ",".join(c.coin_id for c in coins)
        try:
            data = cg.get_price(ids=ids_csv, vs_currencies="usd") or {}
        except Exception as e:
            logger.error(f"CoinGecko API error: {e}", exc_info=True)
            raise HTTPException(status_code=502, detail="CoinGecko API request failed")

        return {c.coin_id: data.get(c.coin_id, {}) for c in coins}

    except Exception as e:
        logger.exception("Error fetching market prices")
        raise HTTPException(status_code=500, detail="Server error fetching market prices")
    finally:
        db.close()


@router.get("/trending")
def get_trending_coins(db: Session = Depends(dependencies.get_db)):
    """
    Get trending coins from database (updated hourly by celery task)
    """
    try:
        trending = db.query(TrendingCoin).order_by(TrendingCoin.rank).limit(15).all()
        
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
            db.query(TopGainerLoser)
            .filter(TopGainerLoser.is_gainer == True)
            .order_by(TopGainerLoser.price_change_percentage_24h.desc())
            .limit(10)
            .all()
        )
        
        # Get top losers (ordered by price change ascending)
        losers = (
            db.query(TopGainerLoser)
            .filter(TopGainerLoser.is_gainer == False)
            .order_by(TopGainerLoser.price_change_percentage_24h.asc())
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