from fastapi import APIRouter, Depends, HTTPException, Query
from app.tasks.fetch_and_store_prices import fetch_price_chart, get_available_coins
from app import dependencies
from pycoingecko import CoinGeckoAPI

router = APIRouter(prefix="/charts", tags=["charts"])

@router.get("/available-coins")
def get_coins():
    """Get list of all available coins"""
    try:
        coins = get_available_coins()
        return coins
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chart/{symbol}")
def get_chart(symbol: str, days: str = Query("365", description="Number of days for chart")):
    """Get price chart data for a symbol"""
    try:
        cg = CoinGeckoAPI()
        
        # Find coin ID from symbol
        from app.tasks.fetch_and_store_prices import SYMBOLS
        coin_id = None
        for name, sym in SYMBOLS.items():
            if sym.upper() == symbol.upper():
                coin_id = name
                break
        
        if not coin_id:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        # Fetch chart data
        data = cg.get_coin_market_chart_by_id(
            id=coin_id,
            vs_currency="usd",
            days=days
        )
        
        # Return prices array directly - format is [timestamp_ms, price]
        return {
            "status": "success",
            "symbol": symbol,
            "prices": data.get("prices", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chart: {str(e)}")