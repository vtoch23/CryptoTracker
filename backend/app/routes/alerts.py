from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies

router = APIRouter(prefix="/alerts", tags=["alerts"])

class AlertItemCreate(schemas.BaseModel):
    symbol: str
    target_price: float

class AlertItemOut(schemas.BaseModel):
    id: int
    symbol: str
    target_price: float
    created_at: schemas.datetime

    class Config:
        from_attributes = True

@router.post("/", response_model=AlertItemOut)
def create_alert(
    item: AlertItemCreate, 
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Create a price alert for a coin - MULTIPLE ALERTS PER COIN ALLOWED"""
    
    if item.target_price < 0:
        raise HTTPException(status_code=400, detail="Target price cannot be negative")
    
    
    new_alert = models.WatchlistItem(
        user_id=user.id,
        symbol=item.symbol.upper(),
        target_price=item.target_price
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.get("/", response_model=List[AlertItemOut])
def get_alerts(
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Get all price alerts for user"""
    alerts = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.target_price.isnot(None)
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
    """Delete an alert"""
    alert = db.query(models.WatchlistItem).filter(
        models.WatchlistItem.id == alert_id,
        models.WatchlistItem.user_id == user.id,
        models.WatchlistItem.target_price.isnot(None)
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(alert)
    db.commit()
    return None