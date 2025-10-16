from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas, dependencies

router = APIRouter(prefix="/cost-basis", tags=["cost-basis"])

@router.get("/", response_model=list[schemas.CostBasisOut])
def get_cost_basis(
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    items = db.query(models.CostBasis).filter(
        models.CostBasis.user_id == user.id
    ).all()
    if not items:
        raise HTTPException(status_code=404, detail="No cost basis records found")
    return items

@router.post("/", response_model=schemas.CostBasisOut)
def create_cost_basis(
    item: schemas.CostBasisCreate,
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    db_item = models.CostBasis(
        user_id=user.id,
        symbol=item.symbol.upper(),
        cost_price=item.cost_price,
        quantity=item.quantity
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.patch("/{item_id}", response_model=schemas.CostBasisOut)
def update_cost_basis(
    item_id: int,
    update_data: dict,
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    item = db.query(models.CostBasis).filter(
        models.CostBasis.id == item_id,
        models.CostBasis.user_id == user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Cost basis record not found")
    
    for key, value in update_data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_cost_basis(
    item_id: int,
    db: Session = Depends(dependencies.get_db),
    user: models.User = Depends(dependencies.get_current_user)
):
    item = db.query(models.CostBasis).filter(
        models.CostBasis.id == item_id,
        models.CostBasis.user_id == user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Cost basis record not found")
    
    db.delete(item)
    db.commit()
    return {"message": "Cost basis record deleted"}