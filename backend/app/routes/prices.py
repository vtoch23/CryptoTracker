# app/routes/prices.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Literal
from datetime import datetime
from app import models, schemas, dependencies
from sqlalchemy import func, desc

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/", response_model=List[schemas.PricePointOut])
def get_latest_prices(db: Session = Depends(dependencies.get_db)):
    """
    Returns the latest price for each symbol.
    """
    try:
        # Use DISTINCT ON for PostgreSQL (most efficient)
        # This gets the latest record per symbol based on timestamp
        latest_prices = (
            db.query(models.PricePoint)
            .distinct(models.PricePoint.symbol)
            .order_by(models.PricePoint.symbol, models.PricePoint.timestamp.desc())
            .all()
        )

        if not latest_prices:
            raise HTTPException(status_code=404, detail="No prices found")
        return latest_prices
    except Exception as e:
        # If DISTINCT ON doesn't work (not PostgreSQL), fall back to window function approach
        try:
            from sqlalchemy import select
            from sqlalchemy.sql import text
            
            # Subquery with row_number to get latest per symbol
            subquery = (
                db.query(
                    models.PricePoint.id,
                    models.PricePoint.symbol,
                    models.PricePoint.price,
                    models.PricePoint.timestamp,
                    func.row_number().over(
                        partition_by=models.PricePoint.symbol,
                        order_by=models.PricePoint.timestamp.desc()
                    ).label('rn')
                )
                .subquery()
            )
            
            latest_prices = (
                db.query(models.PricePoint)
                .join(subquery, models.PricePoint.id == subquery.c.id)
                .filter(subquery.c.rn == 1)
                .all()
            )
            
            if not latest_prices:
                raise HTTPException(status_code=404, detail="No prices found")
            return latest_prices
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(inner_e)}")

@router.get("/{symbol}", response_model=List[schemas.PricePointOut])
def get_price_history(
    symbol: str,
    limit: Optional[int] = Query(100, description="Limit number of records"),
    group_by: Optional[Literal["hour", "day"]] = Query(None, description="Aggregate by hour or day"),
    db: Session = Depends(dependencies.get_db)
):
    """
    Returns price history for a symbol.
    Optionally grouped by hour or day for charting.
    """
    try:
        symbol = symbol.upper()

        if group_by:
            # Aggregate prices over time windows
            if group_by == "hour":
                time_trunc = func.date_trunc("hour", models.PricePoint.timestamp)
            elif group_by == "day":
                time_trunc = func.date_trunc("day", models.PricePoint.timestamp)

            results = (
                db.query(
                    func.max(models.PricePoint.id).label("id"),
                    models.PricePoint.symbol,
                    func.avg(models.PricePoint.price).label("price"),
                    time_trunc.label("timestamp")
                )
                .filter(models.PricePoint.symbol == symbol)
                .group_by(models.PricePoint.symbol, time_trunc)
                .order_by(time_trunc.desc())
                .limit(limit)
                .all()
            )

            # Convert SQLAlchemy Row to dicts with ISO timestamps
            return [
                {
                    "symbol": r.symbol,
                    "price": float(r.price),
                    "timestamp": r.timestamp.isoformat() if isinstance(r.timestamp, datetime) else r.timestamp,
                }
                for r in results
            ]

        else:
            # Raw price history
            prices = (
                db.query(models.PricePoint)
                .filter(models.PricePoint.symbol == symbol)
                .order_by(models.PricePoint.timestamp.desc())
                .limit(limit)
                .all()
            )

            if not prices:
                raise HTTPException(status_code=404, detail=f"No prices found for {symbol}")

            return [
                {
                    "symbol": p.symbol,
                    "price": p.price,
                    "timestamp": p.timestamp.isoformat(),
                }
                for p in prices
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))