from app.database import SessionLocal
from app.models import PricePoint
import httpx
import datetime
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
SYMBOLS = {
    "bitcoin": "BTC",
    "ethereum": "ETH",
    "solana": "SOL",
    "render-token": "RENDER", 
    "ondo-finance": "ONDO",   
    "cardano": "ADA",         
    "ripple": "XRP",        
    "binancecoin": "BNB",
    "aptos": "APT",
    "optimism": "OP",
    "injective-protocol": "INJ",
    "near": "NEAR",       
    "stacks": "STX"      
}

@shared_task(name="app.tasks.fetch_and_store_prices")
def fetch_and_store_prices():
    db = SessionLocal()
    try:
        ids = ",".join(SYMBOLS.keys())
        response = httpx.get(f"{COINGECKO_URL}?ids={ids}&vs_currencies=usd", timeout=10.0)
        response.raise_for_status()
        data = response.json()

        for name, symbol in SYMBOLS.items():
            if name in data and "usd" in data[name]:
                price = float(data[name]["usd"])  # FIXED: Keep as float, not string
                db.add(
                    PricePoint(
                        symbol=symbol.upper(),
                        price=price,
                        timestamp=datetime.datetime.utcnow(),
                    )
                )
            else:
                logger.warning(f"No price data for {name}")
        
        db.commit()
        logger.info(f"Prices updated at {datetime.datetime.utcnow()}")
        return {"status": "success", "symbols": len(SYMBOLS)}
    except Exception as e:
        logger.error(f"Error fetching prices: {e}")
        db.rollback()
        raise
    finally:
        db.close()
