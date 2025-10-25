import sys
sys.path.insert(0, '/Users/Vanya/Development/CryptoTracker/backend')  

from pycoingecko import CoinGeckoAPI
from app.database import SessionLocal
from app.models import Coin
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def populate_coins():
    """Fetch all coins from CoinGecko and populate the database"""
    db = SessionLocal()
    try:
        logger.info("Connecting to CoinGecko API...")
        cg = CoinGeckoAPI()
        
        logger.info("Fetching all coins...")
        coin_list = cg.get_coins_list()
        
        if not coin_list:
            logger.error("Failed to fetch coins from CoinGecko")
            return False
        
        logger.info(f"Got {len(coin_list)} coins from CoinGecko")
        
        # Clear existing coins
        logger.info("Clearing existing coins...")
        db.query(Coin).delete()
        db.commit()
        
        # Insert new coins
        logger.info("Inserting coins into database...")
        inserted = 0
        failed = 0
        
        for coin in coin_list:
            try:
                new_coin = Coin(
                    coin_id=coin["id"],
                    symbol=coin["symbol"].upper()
                )
                db.add(new_coin)
                inserted += 1
                
                # Log progress every 100 coins
                if inserted % 100 == 0:
                    logger.info(f"  Inserted {inserted} coins...")
                    
            except Exception as e:
                logger.warning(f"Failed to insert coin {coin.get('id')}: {e}")
                failed += 1
                continue
        
        db.commit()
        logger.info(f"✅ Successfully inserted {inserted} coins ({failed} failed)")
        return True
        
    except Exception as e:
        logger.error(f"Error populating coins: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting coin population...")
    success = populate_coins()
    sys.exit(0 if success else 1)