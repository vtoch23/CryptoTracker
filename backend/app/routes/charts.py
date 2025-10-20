from fastapi import APIRouter, HTTPException, Query
from app import models, schemas
from app.database import SessionLocal
from pycoingecko import CoinGeckoAPI
from datetime import datetime
import logging
from sqlalchemy import func

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/charts", tags=["charts"])

# Define priority symbols - these are the "official" coins for each symbol
# If multiple coins have the same symbol, prefer these
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
    Deduplicates by symbol, preferring official/priority coins.
    """
    try:
        db = SessionLocal()
        all_coins = db.query(models.Coin).all()
        db.close()
        
        if not all_coins:
            logger.warning("No coins in database. Run update_coins_list task.")
            return []
        
        # Group by symbol
        symbol_map = {}
        for coin in all_coins:
            symbol = coin.symbol.upper()
            
            if symbol not in symbol_map:
                symbol_map[symbol] = coin
            else:
                # If we have a priority for this symbol, use it
                if symbol in PRIORITY_COIN_IDS:
                    if coin.coin_id == PRIORITY_COIN_IDS[symbol]:
                        symbol_map[symbol] = coin  # Use priority coin
                else:
                    # No priority set, keep the first one we found
                    pass
        
        # Convert to result format
        result = [
            {"id": coin.coin_id, "symbol": coin.symbol} 
            for coin in symbol_map.values()
        ]
        
        logger.info(f"Returning {len(result)} deduplicated coins (from {len(all_coins)} total)")
        return sorted(result, key=lambda x: x['symbol'])
        
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
        
        db = SessionLocal()
        coin = db.query(models.Coin).filter(models.Coin.symbol == symbol.upper()).first()
        db.close()
        
        if not coin:
            logger.warning(f"Symbol {symbol} not found in database")
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        coin_id = coin.coin_id
        logger.info(f"Found coin_id: {coin_id} for symbol: {symbol}")
        
        cg = CoinGeckoAPI()
        
        try:
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin_id,
                vs_currency="usd",
                days=days
            )
            
            if not ohlc_data:
                raise HTTPException(status_code=404, detail=f"No OHLC data found for {symbol}")
            
            candles = []
            for candle in ohlc_data:
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
        symbol_upper = symbol.upper()
        logger.info(f"=== HISTORY REQUEST === Symbol: {symbol_upper}, Days: {days}")
        
        db = SessionLocal()
        coin = db.query(models.Coin).filter(models.Coin.symbol == symbol_upper).first()
        db.close()
        
        if not coin:
            logger.error(f"COIN NOT FOUND: {symbol_upper}")
            raise HTTPException(status_code=404, detail=f"Symbol {symbol_upper} not found in database")
        
        logger.info(f"COIN FOUND: coin_id={coin.coin_id}, symbol={coin.symbol}")
        
        cg = CoinGeckoAPI()
        
        try:
            logger.info(f"CALLING API: get_coin_ohlc_by_id(id={coin.coin_id}, days={days})")
            ohlc_data = cg.get_coin_ohlc_by_id(
                id=coin.coin_id,
                vs_currency="usd",
                days=days
            )
            
            logger.info(f"API RESPONSE: Received {len(ohlc_data) if ohlc_data else 0} candles")
            
            if not ohlc_data:
                logger.error(f"NO OHLC DATA from API for {coin.coin_id}")
                raise HTTPException(status_code=404, detail=f"No OHLC data available for {symbol_upper} on CoinGecko")
            
            history = []
            errors = 0
            for idx, candle in enumerate(ohlc_data):
                try:
                    if len(candle) < 5:
                        logger.warning(f"  Candle {idx}: Invalid format (length {len(candle)})")
                        errors += 1
                        continue
                    
                    timestamp = candle[0]
                    open_price = float(candle[1])
                    high_price = float(candle[2])
                    low_price = float(candle[3])
                    close_price = float(candle[4])
                    
                    if close_price == 0:
                        logger.warning(f"  Candle {idx}: Zero price received - {candle}")
                        errors += 1
                        continue
                    
                    history.append({
                        "timestamp": timestamp,
                        "date": _timestamp_to_date(timestamp),
                        "open": open_price,
                        "high": high_price,
                        "low": low_price,
                        "close": close_price
                    })
                except Exception as e:
                    logger.warning(f"  Candle {idx}: Parse error - {e}, data: {candle}")
                    errors += 1
                    continue
            
            logger.info(f"PARSED: {len(history)} valid candles, {errors} errors skipped")
            
            if not history:
                logger.error(f"FAILED: No valid candles parsed for {symbol_upper}")
                raise HTTPException(status_code=500, detail=f"All candles for {symbol_upper} have invalid or zero values")
            
            logger.info(f"SUCCESS: Returning {len(history)} history entries")
            
            return {
                "status": "success",
                "symbol": symbol_upper,
                "history": history
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"API ERROR for {symbol_upper}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"CoinGecko API error: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"UNEXPECTED ERROR in get_history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _timestamp_to_date(timestamp_ms):
    """Convert milliseconds timestamp to date string"""
    try:
        return datetime.fromtimestamp(timestamp_ms / 1000).strftime("%Y-%m-%d")
    except Exception as e:
        logger.error(f"Error converting timestamp {timestamp_ms}: {e}")
        return "N/A"