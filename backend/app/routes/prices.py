from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/{symbol}", response_model=List[schemas.PricePointOut])
def get_prices(symbol: str, db: Session = Depends(dependencies.get_db)):
    prices = db.query(models.PricePoint).filter(models.PricePoint.symbol == symbol).order_by(models.PricePoint.timestamp.desc()).all()
    return prices
