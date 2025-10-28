from fastapi import APIRouter, HTTPException, Query
from app import models
from app.database import SessionLocal
from app.config import settings
from pycoingecko import CoinGeckoAPI
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/charts", tags=["charts"])



_cache = {}

def get_cached_ohlc(coin_id, days):
    key = f"{coin_id}_{days}"
    now = datetime.utcnow()
    # expire after 2 hours (chart data doesn't need to be real-time)
    if key in _cache:
        entry = _cache[key]
        if now - entry["time"] < timedelta(hours=2):
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


def _convert_prices_to_candles(prices, days):
    """
    Convert market_chart prices array into OHLC candles.
    For 7 days, group by 4-hour intervals.
    For longer periods, group by day.
    """
    if not prices:
        return []

    from collections import defaultdict

    # Determine grouping interval based on days
    if days <= 7:
        # For 7 days or less, use 4-hour intervals
        interval_ms = 4 * 60 * 60 * 1000  # 4 hours in milliseconds
    else:
        # For longer periods, use daily intervals
        interval_ms = 24 * 60 * 60 * 1000  # 1 day in milliseconds

    # Group prices by interval
    groups = defaultdict(list)
    for timestamp_ms, price in prices:
        # Round timestamp down to nearest interval
        interval_key = (timestamp_ms // interval_ms) * interval_ms
        groups[interval_key].append(price)

    # Create candles from grouped prices
    candles = []
    for interval_ts in sorted(groups.keys()):
        prices_in_interval = groups[interval_ts]
        if not prices_in_interval:
            continue

        candles.append({
            "timestamp": interval_ts,
            "date": _timestamp_to_date(interval_ts),
            "open": prices_in_interval[0],
            "high": max(prices_in_interval),
            "low": min(prices_in_interval),
            "close": prices_in_interval[-1],
            "x": _timestamp_to_date(interval_ts),
        })

    return candles


def _convert_ohlc_to_candles(ohlc_data):
    """
    Convert OHLC data array into candle format.
    OHLC format: [[timestamp, open, high, low, close], ...]
    """
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
    return candles


# /charts/available-coins
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


# /charts/chart/{coin_id}
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

    # Use demo_api_key parameter for CoinGecko Demo/Pro API
    api_key = settings.COINGECKO_API_KEY
    if api_key:
        cg = CoinGeckoAPI(demo_api_key=api_key)
        logger.info(f"Fetching chart for {coin.symbol} ({coin.coin_id}), {days} days (Using API key)")
    else:
        cg = CoinGeckoAPI()
        logger.info(f"Fetching chart for {coin.symbol} ({coin.coin_id}), {days} days (No API key)")

    try:
        # First try get_coin_market_chart_by_id (more detailed data)
        cached = get_cached_ohlc(coin.coin_id, days)
        if cached is not None:
            logger.info(f"Using cached chart data for {coin.coin_id} ({days}d)")
            raw_data = cached
            is_market_chart = "prices" in cached
        else:
            try:
                # Try market_chart first for more granular data
                market_data = cg.get_coin_market_chart_by_id(id=coin.coin_id, vs_currency="usd", days=days)
                raw_data = market_data
                is_market_chart = True
                set_cached_ohlc(coin.coin_id, days, raw_data)
            except Exception as market_err:
                logger.warning(f"Market chart failed, trying OHLC: {market_err}")
                # Fall back to OHLC if market_chart fails
                ohlc_data = cg.get_coin_ohlc_by_id(id=coin.coin_id, vs_currency="usd", days=days)
                raw_data = ohlc_data
                is_market_chart = False
                set_cached_ohlc(coin.coin_id, days, raw_data)

    except Exception as e:
        logger.error(f"Error fetching chart for {coin.coin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CoinGecko error: {str(e)}")

    # Convert data to candles based on format
    if is_market_chart:
        if not raw_data or "prices" not in raw_data:
            raise HTTPException(status_code=404, detail=f"No price data for {coin.symbol}")
        prices = raw_data.get("prices", [])
        if not prices:
            raise HTTPException(status_code=404, detail=f"No price data for {coin.symbol}")
        candles = _convert_prices_to_candles(prices, days)
    else:
        # Process OHLC data
        if not raw_data:
            raise HTTPException(status_code=404, detail=f"No OHLC data for {coin.symbol}")
        candles = _convert_ohlc_to_candles(raw_data)

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

    # Use demo_api_key parameter for CoinGecko Demo/Pro API
    api_key = settings.COINGECKO_API_KEY
    if api_key:
        cg = CoinGeckoAPI(demo_api_key=api_key)
        logger.info(f"Fetching history for {coin.symbol} ({coin.coin_id}), {days} days (Using API key)")
    else:
        cg = CoinGeckoAPI()
        logger.info(f"Fetching history for {coin.symbol} ({coin.coin_id}), {days} days (No API key)")

    try:
        cached = get_cached_ohlc(coin.coin_id, days)
        if cached is not None:
            logger.info(f"Using cached data for {coin.coin_id} ({days}d)")
            raw_data = cached
            is_market_chart = "prices" in cached
        else:
            try:
                # Try market_chart first
                market_data = cg.get_coin_market_chart_by_id(id=coin.coin_id, vs_currency="usd", days=days)
                raw_data = market_data
                is_market_chart = True
                set_cached_ohlc(coin.coin_id, days, raw_data)
            except Exception as market_err:
                logger.warning(f"Market chart failed for history, trying OHLC: {market_err}")
                # Fall back to OHLC
                ohlc_data = cg.get_coin_ohlc_by_id(id=coin.coin_id, vs_currency="usd", days=days)
                raw_data = ohlc_data
                is_market_chart = False
                set_cached_ohlc(coin.coin_id, days, raw_data)
    except Exception as e:
        logger.error(f"CoinGecko error for {coin.coin_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CoinGecko error: {str(e)}")

    # Convert data to history based on format
    if is_market_chart:
        if not raw_data or "prices" not in raw_data:
            raise HTTPException(status_code=404, detail=f"No price data for {coin.symbol}")
        prices = raw_data.get("prices", [])
        if not prices:
            raise HTTPException(status_code=404, detail=f"No price data for {coin.symbol}")
        history = _convert_prices_to_candles(prices, days)
    else:
        if not raw_data:
            raise HTTPException(status_code=404, detail=f"No OHLC data for {coin.symbol}")
        history = _convert_ohlc_to_candles(raw_data)

    logger.info(f"Returning {len(history)} history entries for {coin.symbol}")
    return {
        "status": "success",
        "symbol": coin.symbol,
        "coin_id": coin.coin_id,
        "history": history,
        "count": len(history),
    }
