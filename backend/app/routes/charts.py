from fastapi import APIRouter, HTTPException, Query
from app import models, schemas
from app.database import SessionLocal
from pycoingecko import CoinGeckoAPI
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/charts", tags=["charts"])

# PRIORITY_COIN_IDS: Handle duplicate symbols
# Multiple coins can share the same symbol (e.g., BTC, ETH, XRP)
# This mapping ensures we return the "main" coin when deduplicating
# Example: BTC could be bitcoin, bitcoin-cash, bitcoin-sv, bitcoin-gold
# We want to return 'bitcoin' as the canonical BTC
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

@router.get("/available-coins")
def get_coins():
    """
    Get list of all available coins from database.
    
    Returns deduplicated list - one coin per symbol.
    For duplicate symbols, uses PRIORITY_COIN_IDS to select the canonical coin.
    
    Returns:
        List[dict]: [{"id": "bitcoin", "symbol": "BTC"}, ...]
    """
    try:
        db = SessionLocal()
        all_coins = db.query(models.Coin).all()
        db.close()
        
        if not all_coins:
            logger.warning("No coins in database.")
            return []
        
        # Deduplicate coins by symbol
        # Keep first occurrence unless there's a priority mapping
        symbol_map = {}
        for coin in all_coins:
            symbol = coin.symbol.upper()
            
            if symbol not in symbol_map:
                # First coin with this symbol - add it
                symbol_map[symbol] = coin
            else:
                # Duplicate symbol - check if this is the priority coin
                if symbol in PRIORITY_COIN_IDS:
                    if coin.coin_id == PRIORITY_COIN_IDS[symbol]:
                        # Replace with priority coin
                        symbol_map[symbol] = coin
        
        result = [
            {"id": coin.coin_id, "symbol": coin.symbol} 
            for coin in symbol_map.values()
        ]
        
        logger.info(f"Returning {len(result)} deduplicated coins")
        return sorted(result, key=lambda x: x['symbol'])
        
    except Exception as e:
        logger.error(f"Error fetching coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/{coin_id}")
def get_chart(
    coin_id: str,
    days: int = Query(30, description="Number of days for chart (1-365)"),
    interval: str = Query("4h", description="Interval: daily, 4h, 1h")
):
    """
    Get OHLC candlestick chart data for a coin.
    
    Uses CoinGecko's /coins/{id}/ohlc endpoint via get_coin_ohlc_by_id().
    This is NOT listed in all pycoingecko docs but is a valid function.
    
    Granularity (determined automatically by 'days' parameter):
    - 1 day = 30 minute intervals
    - 2-90 days = 4 hour intervals  
    - 91+ days = 4 day intervals
    
    Args:
        coin_id: CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
        days: Number of days of data (1-365)
        interval: Requested interval (informational only, actual granularity is auto)
    
    Returns:
        {
            "status": "success",
            "symbol": "BTC",
            "coin_id": "bitcoin",
            "candles": [
                {
                    "timestamp": 1234567890,
                    "date": "2024-01-01",
                    "open": 45000.0,
                    "high": 46000.0,
                    "low": 44000.0,
                    "close": 45500.0,
                    "x": "2024-01-01"
                },
                ...
            ],
            "interval": "4h",
            "count": 180
        }
    """
    try:
        logger.info(f"Fetching chart for coin_id={coin_id}, days={days}, interval={interval}")
        
        # Validate days parameter
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        # Lookup coin in database to verify it exists and get symbol
        db = SessionLocal()
        coin = db.query(models.Coin).filter(models.Coin.coin_id.ilike(coin_id)).first()
        db.close()
        
        if not coin:
            logger.warning(f"Coin ID {coin_id} not found in database")
            raise HTTPException(status_code=404, detail=f"Coin ID {coin_id} not found")
        
        logger.info(f"Found coin: {coin.symbol} ({coin.coin_id})")
        
        # Initialize CoinGecko API client
        cg = CoinGeckoAPI()
        
        try:
            # Fetch OHLC data from CoinGecko
            # Function: get_coin_ohlc_by_id() calls /coins/{id}/ohlc endpoint
            # Returns: [[timestamp, open, high, low, close], ...]
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin.coin_id,
                vs_currency="usd",
                days=days
            )
            
            if not ohlc_data:
                logger.error(f"No OHLC data returned for {coin.coin_id}")
                raise HTTPException(status_code=404, detail=f"No OHLC data for {coin.symbol}")
            
            logger.info(f"Received {len(ohlc_data)} raw OHLC candles from CoinGecko")
            
            # Parse OHLC data into candle objects
            # Each candle: [timestamp_ms, open, high, low, close]
            candles = []
            for idx, candle in enumerate(ohlc_data):
                try:
                    # Validate candle structure
                    if not isinstance(candle, (list, tuple)) or len(candle) < 5:
                        logger.warning(f"Skipping invalid candle at index {idx}: {candle}")
                        continue
                    
                    # Extract OHLC values
                    timestamp = candle[0]
                    open_price = float(candle[1])
                    high_price = float(candle[2])
                    low_price = float(candle[3])
                    close_price = float(candle[4])
                    
                    # Validate prices are positive
                    if any(p <= 0 for p in [open_price, high_price, low_price, close_price]):
                        logger.warning(f"Skipping candle with invalid price at index {idx}")
                        continue
                    
                    # Add formatted candle
                    candles.append({
                        "timestamp": timestamp,
                        "date": _timestamp_to_date(timestamp),
                        "open": open_price,
                        "high": high_price,
                        "low": low_price,
                        "close": close_price,
                        "x": _timestamp_to_date(timestamp)  # For chart x-axis
                    })
                    
                except (IndexError, TypeError, ValueError) as e:
                    logger.warning(f"Error parsing candle at index {idx}: {e}")
                    continue
            
            if not candles:
                logger.error("No valid candles after parsing")
                raise HTTPException(status_code=404, detail="Failed to parse candle data")
            
            logger.info(f"Successfully parsed {len(candles)} candles for {coin.symbol}")
            
            return {
                "status": "success",
                "symbol": coin.symbol,
                "coin_id": coin.coin_id,
                "candles": candles,
                "interval": interval,
                "count": len(candles)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching OHLC from CoinGecko: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to fetch chart: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_chart: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/history/{coin_id}")
def get_history(
    coin_id: str,
    days: int = Query(30, description="Number of days (1-365)")
):
    """
    Get OHLC price history for a coin.
    
    Same data as /chart endpoint but simpler format for price history tables.
    Uses CoinGecko's get_coin_ohlc_by_id() function.
    
    Args:
        coin_id: CoinGecko coin ID (e.g., 'bitcoin', 'ethereum')
        days: Number of days of data (1-365)
    
    Returns:
        {
            "status": "success",
            "symbol": "BTC",
            "coin_id": "bitcoin",
            "history": [
                {
                    "timestamp": 1234567890,
                    "date": "2024-01-01",
                    "open": 45000.0,
                    "high": 46000.0,
                    "low": 44000.0,
                    "close": 45500.0
                },
                ...
            ],
            "count": 30
        }
    """
    try:
        coin_id_lower = coin_id.lower()
        logger.info(f"=== HISTORY REQUEST === coin_id={coin_id_lower}, days={days}")
        
        # Validate days parameter
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        # Lookup coin in database
        db = SessionLocal()
        coin = db.query(models.Coin).filter(models.Coin.coin_id.ilike(coin_id_lower)).first()
        db.close()
        
        if not coin:
            logger.error(f"COIN NOT FOUND: {coin_id_lower}")
            raise HTTPException(status_code=404, detail=f"Coin ID {coin_id_lower} not found")
        
        logger.info(f"COIN FOUND: {coin.symbol} ({coin.coin_id})")
        
        # Initialize CoinGecko API
        cg = CoinGeckoAPI()
        
        try:
            logger.info(f"CALLING API: get_coin_ohlc_by_id(id={coin.coin_id}, days={days})")
            
            # Fetch OHLC data
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin.coin_id,
                vs_currency="usd",
                days=days
            )
            
            logger.info(f"API RESPONSE: {len(ohlc_data) if ohlc_data else 0} candles")
            
            if not ohlc_data:
                logger.error(f"NO OHLC DATA for {coin.coin_id}")
                raise HTTPException(status_code=404, detail=f"No data available for {coin.symbol}")
            
            # Parse OHLC data
            # Format: [timestamp_ms, open, high, low, close]
            history = []
            errors = 0
            
            for idx, candle in enumerate(ohlc_data):
                try:
                    # Validate candle structure
                    if not isinstance(candle, (list, tuple)) or len(candle) < 5:
                        logger.warning(f"Candle {idx}: Invalid format - {candle}")
                        errors += 1
                        continue
                    
                    # Extract values
                    timestamp = candle[0]
                    open_price = float(candle[1])
                    high_price = float(candle[2])
                    low_price = float(candle[3])
                    close_price = float(candle[4])
                    
                    # Validate prices are positive
                    if any(p <= 0 for p in [open_price, high_price, low_price, close_price]):
                        logger.warning(f"Candle {idx}: Invalid price (zero or negative)")
                        errors += 1
                        continue
                    
                    # Add to history
                    history.append({
                        "timestamp": timestamp,
                        "date": _timestamp_to_date(timestamp),
                        "open": open_price,
                        "high": high_price,
                        "low": low_price,
                        "close": close_price
                    })
                    
                except (IndexError, TypeError, ValueError) as e:
                    logger.warning(f"Candle {idx}: Parse error - {e}")
                    errors += 1
                    continue
            
            logger.info(f"PARSED: {len(history)} valid candles, {errors} errors")
            
            if not history:
                logger.error(f"No valid candles for {coin.symbol}")
                raise HTTPException(status_code=500, detail=f"Invalid data for {coin.symbol}")
            
            logger.info(f"SUCCESS: Returning {len(history)} history entries")
            
            return {
                "status": "success",
                "symbol": coin.symbol,
                "coin_id": coin.coin_id,
                "history": history,
                "count": len(history)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"API ERROR: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"API error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"UNEXPECTED ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _timestamp_to_date(timestamp_ms):
    """
    Convert milliseconds timestamp to date string.
    
    Args:
        timestamp_ms: Timestamp in milliseconds (from CoinGecko API)
    
    Returns:
        str: Date in format "YYYY-MM-DD"
    """
    try:
        return datetime.fromtimestamp(timestamp_ms / 1000).strftime("%Y-%m-%d")
    except Exception as e:
        logger.error(f"Error converting timestamp {timestamp_ms}: {e}")
        return "N/A"