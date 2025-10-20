from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/", response_model=schemas.AlertItemOut)
def create_alert(
    item: schemas.AlertItemCreate, 
    db: Session = Depends(dependencies.get_db), 
    user: models.User = Depends(dependencies.get_current_user)
):
    """Create a price alert for a coin - MULTIPLE ALERTS PER COIN ALLOWED"""
    
    if item.target_price < 0:
        raise HTTPException(status_code=400, detail="Target price cannot be negative")
    
    # Validate symbol exists in Coin table
    coin = db.query(models.Coin).filter(
        models.Coin.symbol == item.symbol.upper()
    ).first()
    
    if not coin:
        raise HTTPException(status_code=400, detail=f"Symbol {item.symbol.upper()} not found")
    
    new_alert = models.AlertsItem(
        user_id=user.id,
        symbol=item.symbol.upper(),
        target_price=item.target_price
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
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
    
    db.delete(alert)
    db.commit()
    return None