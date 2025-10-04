from celery import Celery
from app.config import settings
from app.database import SessionLocal
from app.models import PricePoint
import random
import datetime

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

@celery_app.task
def update_prices():
    db = SessionLocal()
    symbols = ["BTC", "ETH", "SOL"]
    for sym in symbols:
        price = random.uniform(20_000, 30_000)  # simulate price
        point = PricePoint(symbol=sym, price=price, timestamp=datetime.datetime.utcnow())
        db.add(point)
    db.commit()
    db.close()
