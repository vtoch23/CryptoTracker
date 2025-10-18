from app.database import SessionLocal
from app.models import PricePoint
import httpx
import datetime
from celery import shared_task
import logging
from pycoingecko import CoinGeckoAPI

cg = CoinGeckoAPI()

coin_list = cg.get_coins_list()


logger = logging.getLogger(__name__)

COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
SYMBOLS = {}

for coin in coin_list:
    SYMBOLS[coin['id']] = coin['symbol']


def get_available_coins():
    return [{"id": coin_id, "symbol": symbol.upper()} for coin_id, symbol in SYMBOLS.items()]

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
                price = float(data[name]["usd"])
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

@shared_task(name="app.tasks.fetch_price_chart")
def fetch_price_chart(symbol: str, days: str = "365"):
    """Fetch price chart data from CoinGecko"""
    try:
        cg = CoinGeckoAPI()
        # Find the coin ID from symbol
        coin_id = None
        for name, sym in SYMBOLS.items():
            if sym.upper() == symbol.upper():
                coin_id = name
                break
        
        if not coin_id:
            return {"status": "error", "message": f"Symbol {symbol} not found"}
        
        # Fetch market chart data
        data = cg.get_coin_market_chart_by_id(
            id=coin_id,
            vs_currency="usd",
            days=days
        )
        
        return {
            "status": "success",
            "symbol": symbol,
            "prices": data.get("prices", []),
            "market_caps": data.get("market_caps", []),
            "volumes": data.get("volumes", [])
        }
    except Exception as e:
        logger.error(f"Error fetching chart for {symbol}: {e}")
        return {"status": "error", "message": str(e)}