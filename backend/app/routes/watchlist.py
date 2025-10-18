from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies
from app.tasks.fetch_and_store_prices import SYMBOLS  

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

# New schema for watchlist (no target price)
class WatchlistItemCreateSimple(schemas.BaseModel):
    symbol: str

class WatchlistItemOutSimple(schemas.BaseModel):
    id: int
    symbol: str
    created_at: schemas.datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=WatchlistItemOutSimple)
def add_item(
    item: WatchlistItemCreateSimple, 
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Add a coin to watchlist (no target price needed)"""
    valid_symbols = set(SYMBOLS.values())
    
    if item.symbol.lower() not in valid_symbols:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid symbol. Must be one of {', '.join(sorted(valid_symbols))}"
        )
    
    # Check if already in watchlist
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.symbol == item.symbol.upper(),
        models.WatchlistItem.target_price.is_(None)  # Only watchlist items (no target price)
    ).first()
    
    if existing_item:
        raise HTTPException(status_code=400, detail=f"{item.symbol.upper()} already in watchlist")
    
    new_item = models.WatchlistItem(
        user_id=user.id,
        symbol=item.symbol.upper(),
        target_price=None  # No target price for watchlist
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/", response_model=List[WatchlistItemOutSimple])
def get_watchlist(
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Get all coins in watchlist (without target price)"""
    items = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.target_price.is_(None)  # Only watchlist items
    ).all()
    
    # if not items:
    #     raise HTTPException(status_code=404, detail="Watchlist is empty")
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
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.target_price.is_(None)  # Only watchlist items
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    db.delete(item)
    db.commit()
    return None