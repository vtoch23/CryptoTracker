from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies

router = APIRouter(prefix="/watchlist", tags=["watchlist"])

@router.post("/", response_model=schemas.WatchlistItemOut)
def add_item(item: schemas.WatchlistItemCreate, db: Session = Depends(dependencies.get_db), user: models.User = Depends(dependencies.get_current_user)):
    new_item = models.WatchlistItem(user_id=user.id, symbol=item.symbol, target_price=item.target_price)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/", response_model=List[schemas.WatchlistItemOut])
def get_watchlist(db: Session = Depends(dependencies.get_db), user: models.User = Depends(dependencies.get_current_user)):
    items = db.query(models.WatchlistItem).filter(models.WatchlistItem.user_id == user.id).all()
    return items
