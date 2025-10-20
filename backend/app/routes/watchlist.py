from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

@router.post("/", response_model=schemas.WatchlistItemOut)
def add_item(
    item: schemas.WatchlistItemCreate, 
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Add a coin to watchlist with multiple lookup strategies"""
    
    symbol_upper = item.symbol.upper()
    logger.info(f"Adding to watchlist: {symbol_upper}")
    
    # Strategy 1: Exact symbol match
    logger.info(f"Strategy 1: Looking for exact symbol match: {symbol_upper}")
    coin = db.query(models.Coin).filter(
        models.Coin.symbol == symbol_upper
    ).first()
    
    # Strategy 2: Case-insensitive symbol match
    if not coin:
        logger.info(f"Strategy 1 failed. Strategy 2: Case-insensitive search for symbol")
        coin = db.query(models.Coin).filter(
            models.Coin.symbol.ilike(symbol_upper)
        ).first()
    
    # Strategy 3: Partial match on coin_id (user might have typed partial name)
    if not coin:
        logger.info(f"Strategy 2 failed. Strategy 3: Partial coin_id match")
        search_term = f"%{item.symbol.lower()}%"
        coin = db.query(models.Coin).filter(
            models.Coin.coin_id.ilike(search_term)
        ).first()
    
    # Strategy 4: Get all coins and log for debugging
    if not coin:
        logger.warning(f"All strategies failed for: {symbol_upper}")
        all_coins = db.query(models.Coin).all()
        logger.info(f"Available coins in database: {[(c.symbol, c.coin_id) for c in all_coins[:10]]}")
        logger.info(f"Total coins in database: {len(all_coins)}")
        
        raise HTTPException(
            status_code=400, 
            detail=f"Symbol {symbol_upper} not found in database. Available symbols: {', '.join([c.symbol for c in all_coins[:5]])}..."
        )
    
    logger.info(f"Found coin: {coin.symbol} ({coin.coin_id})")
    
    # Check if already in watchlist
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.symbol == coin.symbol
    ).first()
    
    if existing_item:
        raise HTTPException(status_code=400, detail=f"{coin.symbol} already in watchlist")
    
    new_item = models.WatchlistItem(
        user_id=user.id,
        symbol=coin.symbol,
        coin_id=coin.coin_id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    logger.info(f"Successfully added {coin.symbol} to watchlist")
    return new_item

@router.get("/", response_model=List[schemas.WatchlistItemOut])
def get_watchlist(
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Get all coins in watchlist for current user"""
    items = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id
    ).all()
    
    return items

@router.delete("/{item_id}", status_code=204)
def remove_item(
    item_id: int,
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    """Remove a coin from watchlist"""
    item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == item_id,
        models.WatchlistItem.user_id == user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    db.delete(item)
    db.commit()
    return None