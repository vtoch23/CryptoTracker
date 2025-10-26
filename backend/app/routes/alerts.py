from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/", response_model=schemas.AlertItemOut)
def create_alert(
    item: schemas.AlertItemCreate, 
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Create a price alert for a coin using symbol"""
    
    if item.target_price < 0:
        raise HTTPException(status_code=400, detail="Target price cannot be negative")
    
    symbol_upper = item.symbol.upper()
    logger.info(f"Creating alert for {symbol_upper} at ${item.target_price} for user {user.id}")
    
    # Strategy 1: Look up by exact symbol match
    coin = db.query(models.Coin).filter(
        models.Coin.symbol == symbol_upper
    ).first()
    
    # Strategy 2: Case-insensitive match
    if not coin:
        coin = db.query(models.Coin).filter(
            models.Coin.symbol.ilike(symbol_upper)
        ).first()
    
    if not coin:
        logger.warning(f"Coin not found for symbol: {symbol_upper}")
        raise HTTPException(status_code=400, detail=f"Symbol {symbol_upper} not found. Please add it to your watchlist first.")
    
    logger.info(f"Found coin: {coin.symbol} ({coin.coin_id})")
    
    # Create alert using the symbol
    new_alert = models.AlertsItem(
        user_id=user.id,
        symbol=coin.symbol,  # Use the actual symbol from database
        target_price=item.target_price
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    logger.info(f"Alert created successfully for {coin.symbol}")
    return new_alert

@router.get("/", response_model=List[schemas.AlertItemOut])
def get_alerts(
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Get all price alerts for current user"""
    alerts = db.query(models.AlertsItem).filter(
        models.AlertsItem.user_id == user.id
    ).all()
    
    if not alerts:
        raise HTTPException(status_code=404, detail="No alerts found")
    return alerts

@router.delete("/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    """Delete a specific price alert"""
    alert = db.query(models.AlertsItem).filter(
        models.AlertsItem.id == alert_id,
        models.AlertsItem.user_id == user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    logger.info(f"Deleting alert {alert_id} for user {user.id}")
    db.delete(alert)
    db.commit()
    return None