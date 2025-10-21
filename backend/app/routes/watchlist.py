from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# Update the schema to accept coin_id
class WatchlistItemCreateByID(schemas.BaseModel):
    coin_id: str  # Primary key: use coin_id instead of symbol

@router.post("/", response_model=schemas.WatchlistItemOut)
def add_item(
    item: WatchlistItemCreateByID,  # Changed schema
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Add a coin to watchlist using coin_id (unique identifier)"""
    
    coin_id = item.coin_id.lower()
    logger.info(f"Adding to watchlist: coin_id={coin_id}, user_id={user.id}")
    
    # Look up coin by coin_id (this is unique and unambiguous)
    coin = db.query(models.Coin).filter(
        models.Coin.coin_id.ilike(coin_id)
    ).first()
    
    if not coin:
        logger.warning(f"Coin not found: {coin_id}")
        all_coins = db.query(models.Coin).limit(10).all()
        raise HTTPException(
            status_code=400, 
            detail=f"Coin ID '{coin_id}' not found in database."
        )
    
    logger.info(f"Found coin: {coin.symbol} ({coin.coin_id})")
    
    # Check if already in watchlist
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.coin_id == coin.coin_id  # Use coin_id
    ).first()
    
    if existing_item:
        raise HTTPException(
            status_code=400, 
            detail=f"{coin.symbol} already in watchlist"
        )
    
    new_item = models.WatchlistItem(
        user_id=user.id,
        symbol=coin.symbol,
        coin_id=coin.coin_id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    logger.info(f"Successfully added {coin.symbol} ({coin.coin_id}) to watchlist for user {user.id}")
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
    
    logger.info(f"Retrieved {len(items)} watchlist items for user {user.id}")
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
    
    logger.info(f"Removing {item.symbol} ({item.coin_id}) from watchlist for user {user.id}")
    db.delete(item)
    db.commit()
    return None