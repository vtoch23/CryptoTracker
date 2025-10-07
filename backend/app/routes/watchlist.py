from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies
from app.tasks.fetch_and_store_prices import SYMBOLS  

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

@router.post("/", response_model=schemas.WatchlistItemOut)
def add_item(item: schemas.WatchlistItemCreate, db: Session = Depends(dependencies.get_db), user: models.User = Depends(dependencies.get_current_user)):
    valid_symbols = set(SYMBOLS.keys())
    if item.symbol.lower() not in valid_symbols:
        raise HTTPException(status_code=400, detail=f"Invalid symbol. Must be one of {', '.join(valid_symbols)}")
    existing_item = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.symbol == item.symbol.lower()
    ).first()
    if existing_item:
        raise HTTPException(status_code=400, detail="Symbol already in watchlist")
    if item.target_price is not None and item.target_price < 0:
        raise HTTPException(status_code=400, detail="Target price cannot be negative")
    new_item = models.WatchlistItem(
        user_id=user.id,
        symbol=item.symbol.lower(),
        target_price=item.target_price
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/", response_model=List[schemas.WatchlistItemOut])
def get_watchlist(db: Session = Depends(dependencies.get_db), user: models.User = Depends(dependencies.get_current_user)):
    items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    if not items:
        raise HTTPException(status_code=404, detail="No items in watchlist")
    return items