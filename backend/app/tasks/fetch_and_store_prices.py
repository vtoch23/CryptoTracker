# app/tasks/fetch_and_store_prices.py
from app.database import SessionLocal
from app.models import PricePoint
import httpx
import datetime
from celery import shared_task

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
SYMBOLS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "solana": "SOL",
    "render-token": "RENDER",  # Changed to uppercase
    "ondo-finance": "ONDO",     # Changed to uppercase
    "cardano": "ADA",           # Changed to proper ticker
    "ripple": "XRP",            # Changed to proper ticker
    "binancecoin": "BNB",
    "aptos": "APT",
    "optimism": "OP",
    "injective-protocol": "INJ",
    "near": "NEAR",             # Changed to uppercase
    "stacks": "STX"             # Changed to proper ticker
}

@shared_task(name="app.tasks.fetch_and_store_prices")
def fetch_and_store_prices():
    db = SessionLocal()
    try:
        ids = ",".join(SYMBOLS.keys())
        response = httpx.get(f"{COINGECKO_URL}?ids={ids}&vs_currencies=usd")
        data = response.json()

        for name, symbol in SYMBOLS.items():
            price = "$"+data[name]["usd"]
            db.add(
                PricePoint(
                    symbol=symbol.upper(),
                    price=price,
                    timestamp=datetime.datetime.utcnow(),
                )
            )
        db.commit()
        print(f"Prices updated at {datetime.datetime.utcnow()}")
    except Exception as e:
        print(f"Error fetching prices: {e}")
        db.rollback()
    finally:
        db.close()