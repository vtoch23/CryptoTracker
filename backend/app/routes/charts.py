from fastapi import APIRouter, HTTPException, Query
from app.tasks.fetch_and_store_prices import get_available_coins, SYMBOLS
from pycoingecko import CoinGeckoAPI
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/charts", tags=["charts"])

@router.get("/available-coins")
def get_coins():
    """Get list of all available coins"""
    try:
        coins = get_available_coins()
        return coins
    except Exception as e:
        logger.error(f"Error fetching coins: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/{symbol}")
def get_chart(
    symbol: str,
    days: int = Query(30, description="Number of days for chart"),
    interval: str = Query("4h", description="Interval: daily, 4h, 1h")
):
    """Get price chart data for a symbol with candle data"""
    try:
        logger.info(f"Fetching chart for {symbol} - {days} days - interval: {interval}")
        
        # Find coin ID from symbol
        coin_id = None
        for name, sym in SYMBOLS.items():
            if sym.upper() == symbol.upper():
                coin_id = name
                break
        
        if not coin_id:
            logger.warning(f"Symbol {symbol} not found in SYMBOLS")
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        logger.info(f"Found coin_id: {coin_id} for symbol: {symbol}")
        
        cg = CoinGeckoAPI()
        
        try:
            # Fetch OHLC data for candles
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin_id,
                vs_currency="usd",
                days=days
            )
            print(ohlc_data)
            if not ohlc_data:
                raise HTTPException(status_code=404, detail=f"No OHLC data found for {symbol}")
            
            # Transform OHLC to candle format
            candles = []
            for candle in ohlc_data:
                print(candle)
                try:
                    timestamp, open_price, high_price, low_price, close_price = candle[0], candle[1], candle[2], candle[3], candle[4]
                    candles.append({
                        "timestamp": timestamp,
                        "date": _timestamp_to_date(timestamp),
                        "open": float(open_price),
                        "high": float(high_price),
                        "low": float(low_price),
                        "close": float(close_price),
                        "x": _timestamp_to_date(timestamp)
                    })
                except (IndexError, TypeError, ValueError) as e:
                    logger.warning(f"Error parsing candle: {e}")
                    continue
            
            if not candles:
                raise HTTPException(status_code=404, detail="Failed to parse candle data")
            
            logger.info(f"Successfully fetched {len(candles)} candles for {symbol}")
            
            return {
                "status": "success",
                "symbol": symbol,
                "candles": candles,
                "interval": interval
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching OHLC for {symbol}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_chart: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/history/{symbol}")
def get_history(
    symbol: str,
    days: int = Query(30, description="Number of days")
):
    """Get OHLC history data for displaying price history"""
    try:
        logger.info(f"Fetching history for {symbol} - {days} days")
        
        # Find coin ID from symbol
        coin_id = None
        for name, sym in SYMBOLS.items():
            if sym.upper() == symbol.upper():
                coin_id = name
                break
        
        if not coin_id:
            logger.warning(f"Coin not found for symbol: {symbol}")
            logger.warning(f"Available symbols in SYMBOLS: {list(SYMBOLS.values())}")
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        logger.info(f"Found coin_id: {coin_id} for symbol: {symbol}")
        
        cg = CoinGeckoAPI()
        
        try:
            # Fetch OHLC data
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin_id,
                vs_currency="usd",
                days=days
            )
            
            if not ohlc_data:
                raise HTTPException(status_code=404, detail=f"No history data found for {symbol}")
            
            # Transform OHLC data to format needed for frontend
            history = []
            for candle in ohlc_data:
                try:
                    if len(candle) >= 5:
                        timestamp = candle[0]
                        open_price = float(candle[1])
                        high_price = float(candle[2])
                        low_price = float(candle[3])
                        close_price = float(candle[4])
                        
                        history.append({
                            "timestamp": timestamp,
                            "date": _timestamp_to_date(timestamp),
                            "open": open_price,
                            "high": high_price,
                            "low": low_price,
                            "close": close_price
                        })
                except (IndexError, TypeError, ValueError) as e:
                    logger.warning(f"Error parsing history candle: {e}")
                    continue
            
            if not history:
                raise HTTPException(status_code=500, detail="Failed to parse history data")
            
            logger.info(f"Successfully fetched {len(history)} history entries for {symbol}")
            
            return {
                "status": "success",
                "symbol": symbol,
                "history": history
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching OHLC for {symbol}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


def _timestamp_to_date(timestamp_ms):
    """Convert milliseconds timestamp to date string"""
    try:
        return datetime.fromtimestamp(timestamp_ms / 1000).strftime("%Y-%m-%d")
    except Exception as e:
        logger.error(f"Error converting timestamp {timestamp_ms}: {e}")
        return "N/A"