from celery import Celery
from app.database import SessionLocal
from app.models import PricePoint
import random
import datetime

from app.worker.celery_app import celery_app as celery

@celery.task
def update_prices():
    db = SessionLocal()
    try:
        symbols = ["BTC", "ETH", "SOL"]
        for sym in symbols:
            price = random.uniform(20_000, 30_000)
            point = PricePoint(symbol=sym, price=price, timestamp=datetime.datetime.utcnow())
            db.add(point)
        db.commit()
    finally:
        db.close()