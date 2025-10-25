from fastapi import APIRouter, HTTPException, Query
from app import models
from app.database import SessionLocal
from pycoingecko import CoinGeckoAPI
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/charts", tags=["charts"])



_cache = {}

def get_cached_ohlc(coin_id, days):
    key = f"{coin_id}_{days}"
    now = datetime.utcnow()
    # expire after 15 min
    if key in _cache:
        entry = _cache[key]
        if now - entry["time"] < timedelta(minutes=15):
            return entry["data"]
    return None

def set_cached_ohlc(coin_id, days, data):
    _cache[f"{coin_id}_{days}"] = {"data": data, "time": datetime.utcnow()}


# Canonical coin priority map for duplicate symbols
PRIORITY_COIN_IDS = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'XRP': 'ripple',
    'NEAR': 'near',
    'RENDER': 'render-token',
    'STX': 'blockstack',
    'APT': 'aptos',
    'INJ': 'injective-protocol',
    'OP': 'optimism',
    'BCH': 'bitcoin-cash',
    'BSV': 'bitcoin-sv',
    'BTG': 'bitcoin-gold',
}


def _timestamp_to_date(timestamp_ms):
    """Convert timestamp (ms) to date string."""
    try:
        return datetime.fromtimestamp(timestamp_ms / 1000).strftime("%Y-%m-%d")
    except Exception as e:
        logger.error(f"Error converting timestamp {timestamp_ms}: {e}")
        return "N/A"


# -------------------------------------------------------------------------
# /charts/available-coins
# -------------------------------------------------------------------------
@router.get("/available-coins")
def get_available_coins():
    """Return a deduplicated list of coins for dropdown."""
    db = SessionLocal()
    try:
        coins = db.query(models.Coin).all()
    except Exception as e:
        logger.error(f"DB error fetching coins: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        db.close()

    if not coins:
        logger.warning("No coins in database.")
        return []

    symbol_map = {}
    for coin in coins:
        sym = coin.symbol.upper()
        if sym not in symbol_map:
            symbol_map[sym] = coin
        elif sym in PRIORITY_COIN_IDS and coin.coin_id == PRIORITY_COIN_IDS[sym]:
            symbol_map[sym] = coin

    result = [{"id": c.coin_id, "symbol": c.symbol} for c in symbol_map.values()]
    result.sort(key=lambda x: x["symbol"])
    logger.info(f"Returning {len(result)} coins to frontend")
    return result


# -------------------------------------------------------------------------
# /charts/chart/{coin_id}
# -------------------------------------------------------------------------
@router.get("/chart/{coin_id}")
def get_chart(
    coin_id: str,
    days: int = Query(30, ge=1, le=365),
    interval: str = Query("4h", description="Chart interval (UI hint only)"),
):
    """Return OHLC chart data for a coin (for charts tab)."""
    db = SessionLocal()
    try:
        coin = db.query(models.Coin).filter(models.Coin.coin_id.ilike(coin_id)).first()
    finally:
        db.close()

    if not coin:
        raise HTTPException(status_code=404, detail=f"Coin {coin_id} not found")

    cg = CoinGeckoAPI()
    logger.info(f"Fetching chart for {coin.symbol} ({coin.coin_id}), {days} days")

    try:
        cached = get_cached_ohlc(coin.coin_id, days)
        if cached is not None:
            logger.info(f"Using cached OHLC for {coin.coin_id} ({days}d)")
            ohlc_data = cached
        else:
            ohlc_data = cg.get_coin_ohlc_by_id(id=coin.coin_id, vs_currency="usd", days=_normalize_days(days))
            set_cached_ohlc(coin.coin_id, days, ohlc_data)
        
    except Exception as e:
        logger.error(f"Error fetching OHLC for {coin.coin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CoinGecko error: {str(e)}")

    if not ohlc_data:
        raise HTTPException(status_code=404, detail=f"No OHLC data for {coin.symbol}")

    candles = []
    for i, c in enumerate(ohlc_data):
        try:
            if not isinstance(c, (list, tuple)) or len(c) < 5:
                continue
            ts, o, h, l, cl = int(c[0]), float(c[1]), float(c[2]), float(c[3]), float(c[4])
            if any(v <= 0 for v in (o, h, l, cl)):
                continue
            d = _timestamp_to_date(ts)
            candles.append({
                "timestamp": ts,
                "date": d,
                "open": o,
                "high": h,
                "low": l,
                "close": cl,
                "x": d,
            })
        except Exception as e:
            logger.warning(f"Skipping candle {i}: {e}")
            continue

    return {
        "status": "success",
        "symbol": coin.symbol,
        "coin_id": coin.coin_id,
        "candles": candles,
        "interval": interval,
        "count": len(candles),
    }


def _normalize_days(days: int) -> int:
    valid_days = [1, 7, 14, 30, 90, 180, 365]
    return min(valid_days, key=lambda d: abs(d - days))


@router.get("/history/{coin_id}")
def get_history(coin_id: str, days: int = Query(30, ge=1, le=365)):
    """Return OHLC history (table view)."""
    coin_id = coin_id.lower()
    db = SessionLocal()
    try:
        coin = db.query(models.Coin).filter(models.Coin.coin_id.ilike(coin_id)).first()
    finally:
        db.close()

    if not coin:
        raise HTTPException(status_code=404, detail=f"Coin {coin_id} not found")

    cg = CoinGeckoAPI()
    logger.info(f"Fetching history for {coin.symbol} ({coin.coin_id}), {days} days")

    try:
        cached = get_cached_ohlc(coin.coin_id, days)
        if cached is not None:
            logger.info(f"Using cached OHLC for {coin.coin_id} ({days}d)")
            ohlc_data = cached
        else:
            ohlc_data = cg.get_coin_ohlc_by_id(id=coin.coin_id, vs_currency="usd", days=_normalize_days(days))
            set_cached_ohlc(coin.coin_id, days, ohlc_data)
    except Exception as e:
        logger.error(f"CoinGecko error for {coin.coin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CoinGecko error: {str(e)}")

    if not ohlc_data:
        raise HTTPException(status_code=404, detail=f"No OHLC data for {coin.symbol}")

    history = []
    for i, c in enumerate(ohlc_data):
        try:
            if not isinstance(c, (list, tuple)) or len(c) < 5:
                continue
            ts, o, h, l, cl = int(c[0]), float(c[1]), float(c[2]), float(c[3]), float(c[4])
            if any(v <= 0 for v in (o, h, l, cl)):
                continue
            history.append({
                "timestamp": ts,
                "date": _timestamp_to_date(ts),
                "open": o,
                "high": h,
                "low": l,
                "close": cl,
            })
        except Exception as e:
            logger.warning(f"Skipping candle {i}: {e}")
            continue

    logger.info(f"Returning {len(history)} history entries for {coin.symbol}")
    return {
        "status": "success",
        "symbol": coin.symbol,
        "coin_id": coin.coin_id,
        "history": history,
        "count": len(history),
    }
