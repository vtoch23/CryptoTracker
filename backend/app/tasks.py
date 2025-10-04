from .celery_app import celery
import os
import httpx
from datetime import datetime


COINGECKO = os.getenv("COINGECKO_API_URL", "https://api.coingecko.com/api/v3")


@celery.task
def fetch_and_store_prices():
    # For MVP: get top 10 coins and log or store the prices
    url = f"{COINGECKO}/coins/markets"
    params = {"vs_currency": "usd", "order": "market_cap_desc", "per_page": 10, "page": 1}
    with httpx.Client(timeout=10) as client:
        r = client.get(url, params=params)
        r.raise_for_status()
        data = r.json()
        # TODO: insert into DB using SQLAlchemy session
        print(f"fetched {len(data)} prices at {datetime.utcnow().isoformat()}")