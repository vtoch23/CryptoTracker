from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app import models, schemas, dependencies

router = APIRouter(prefix="/fetch", tags=["fetch"])

@router.post("/fetch", status_code=202)
def trigger_price_fetch():
    from app.tasks.fetch_and_store_prices import fetch_and_store_prices
    fetch_and_store_prices.delay()
    return {"message": "Price fetch task triggered"}
