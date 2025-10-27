from app.database import SessionLocal
from app.models import PricePoint, Coin, WatchlistItem, User, AlertsItem
import datetime
from celery import shared_task
import logging
from pycoingecko import CoinGeckoAPI
from app.config import settings
from sqlalchemy import func
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


logger = logging.getLogger(__name__)

cg = CoinGeckoAPI(demo_api_key=settings.COINGECKO_API_KEY)


def check_price_alerts():
    logger.info("Checking price alerts")
    """
    Check all price alerts and send notifications when target prices are met.
    """
    db = SessionLocal()
    try:
        # Get all alerts
        alerts = db.query(AlertsItem).all()

        if not alerts:
            logger.info("No price alerts")
            return {"status": "success", "alerts_sent": 0}

        # Get latest prices
        subquery = (
            db.query(
                PricePoint.symbol,
                func.max(PricePoint.timestamp).label("max_timestamp")
            )
            .group_by(PricePoint.symbol)
            .subquery()
        )

        latest_prices = (
            db.query(PricePoint)
            .join(
                subquery,
                (PricePoint.symbol == subquery.c.symbol) &
                (PricePoint.timestamp == subquery.c.max_timestamp)
            )
            .all()
        )

        # Create price lookup dict
        price_dict = {price.symbol.upper(): price.price for price in latest_prices}

        alerts_sent = 0
        alerts_checked = 0
        alerts_to_delete = []
        
        for alert in alerts:
            alerts_checked += 1
            symbol_upper = alert.symbol.upper()
            current_price = price_dict.get(symbol_upper)
            
            if current_price is None:
                logger.warning(f"No price found for {symbol_upper}")
                continue

            target_price = alert.target_price
            
            # Check if target price is met or exceeded
            if current_price >= target_price:
                user = db.query(User).filter(User.id == alert.user_id).first()
                
                if user and user.is_active:
                    try:
                        # Send email
                        send_price_alert_email(
                            user_email=user.email,
                            symbol=symbol_upper,
                            current_price=current_price,
                            target_price=target_price
                        )
                        
                        alerts_sent += 1
                        logger.info(f"Alert sent to {user.email} for {symbol_upper}: ${current_price:.2f} >= ${target_price:.2f}")
                        
                        # Mark for deletion
                        alerts_to_delete.append(alert.id)
                        
                    except Exception as e:
                        logger.error(f"Failed to send alert to {user.email}: {e}")

        # Delete triggered alerts
        for alert_id in alerts_to_delete:
            db.query(AlertsItem).filter(AlertsItem.id == alert_id).delete()
        
        db.commit()
        logger.info(f"Checked {alerts_checked} alerts, sent {alerts_sent} notifications")
        return {"status": "success", "checked": alerts_checked, "alerts_sent": alerts_sent}

    except Exception as e:
        logger.error(f"Error checking price alerts: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


def send_price_alert_email(user_email: str, symbol: str, current_price: float, target_price: float):
    """Send email notification when price target is reached."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'{symbol} Price Alert: ${current_price:,.2f}'
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = user_email

        price_change = current_price - target_price
        price_change_pct = (price_change / target_price) * 100

        html = f"""
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fa;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Target Reached!</h1>
              </div>
              
              <!-- Main Content -->
              <div style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">{symbol}</div>
                  <div style="font-size: 48px; font-weight: 700; color: #10b981; margin-bottom: 8px;">${current_price:,.2f}</div>
                  <div style="display: inline-block; background: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    +${price_change:.2f} ({price_change_pct:+.2f}%)
                  </div>
                </div>
                
                <!-- Details Box -->
                <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; color: #64748b; font-size: 15px;">Your Target Price</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #1e293b; font-size: 16px;">${target_price:,.2f}</td>
                    </tr>
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="padding: 12px 0; color: #64748b; font-size: 15px;">Current Price</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #10b981; font-size: 16px;">${current_price:,.2f}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                    <strong>Action Needed:</strong><br>
                    Your {symbol} target has been reached. Consider reviewing your investment strategy.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                  Automated alert from Crypto Price Tracker
                </p>
              </div>
            </div>
          </body>
        </html>
        """

        text = f"""
PRICE ALERT: {symbol}

Your target price has been reached!

Current Price:    ${current_price:,.2f}
Your Target:      ${target_price:,.2f}
Exceeded By:      +${price_change:.2f} ({price_change_pct:+.2f}%)

This is an automated alert from Crypto Price Tracker.
        """

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Send email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {user_email}")

    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")
        raise

@shared_task(name="app.tasks.fetch_and_store_prices")
def fetch_and_store_prices():
    print("="*60, "Fetch prices celery task called")
    db = SessionLocal()
    try:
        # Get all unique coin_ids from watchlist
        watchlist_coins = (
            db.query(WatchlistItem.coin_id, WatchlistItem.symbol)
            .distinct(WatchlistItem.coin_id)
            .filter(WatchlistItem.coin_id.isnot(None))
            .all()
        )
        
        if not watchlist_coins:
            logger.info("No coins in any watchlist")
            return {"status": "success", "symbols": 0}
        
        coin_ids = [c[0] for c in watchlist_coins]
        symbol_map = {c[0]: c[1] for c in watchlist_coins}


        logger.info(f"Fetching prices for {len(coin_ids)} coins from watchlist")
        
        # Get symbol mapping from Coin table
        coins = db.query(Coin).all()
        coin_id_to_symbol = {c.coin_id: c.symbol for c in coins}
        
        # Fetch prices in batches from CoinGecko
        batch_size = 10
        all_prices = {}
        
        cg = CoinGeckoAPI()
        
        for i in range(0, len(coin_ids), batch_size):
            batch = coin_ids[i:i + batch_size]
            ids_str = ",".join(batch)
            
            try:
                logger.info(f"Fetching batch {i//batch_size + 1}/{(len(coin_ids) + batch_size - 1)//batch_size}...")
                
                response = cg.get_price(
                    ids=ids_str,
                    vs_currencies="usd",
                    include_market_cap=False,
                    include_24hr_vol=False,
                    include_last_updated_at=False
                )
                
                all_prices.update(response)
                logger.info(f"Batch {i//batch_size + 1} returned {len(response)} prices")
                logger.info(f"Prices returned {response}")
            except Exception as e:
                logger.error(f"Error fetching batch {i//batch_size}: {e}")
                continue
        
        if not all_prices:
            logger.warning("No prices returned from CoinGecko")
            return {"status": "error", "message": "No prices from API"}
        
        # Insert price points
        timestamp = datetime.datetime.utcnow()
        prices_added = 0
        
        for coin_id, price_data in all_prices.items():
            logger.info(f"Processing {coin_id}: {price_data}")
            
            if isinstance(price_data, dict) and "usd" in price_data:
                symbol = symbol_map.get(coin_id, coin_id.upper())
                price_raw = price_data["usd"]
                price = float(price_raw)
                
                logger.info(f"✓ {symbol} ({coin_id}): {price}")
                
                # Add to database
                price_point = PricePoint(
                    symbol=symbol,
                    price=price,
                    timestamp=timestamp
                )
                db.add(price_point)
                prices_added += 1                
            else:
                logger.warning(f"✗ No USD price for {coin_id}: {price_data}")
        
        db.commit()

        logger.info(f"Prices updated at {timestamp.isoformat()}: {prices_added} coins stored")
        return {"status": "success", "symbols": prices_added, "timestamp": timestamp.isoformat()}
        
    except Exception as e:
        logger.error(f"Error fetching prices: {e}", exc_info=True)
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
        check_price_alerts()



@shared_task(name="app.tasks.update_coins_list")
def update_coins_list():
    """
    Update the Coins table with all available coins from CoinGecko.
    Run once a week.
    """
    db = SessionLocal()
    try:
        cg = CoinGeckoAPI()
        logger.info("Fetching coins list from CoinGecko...")
        coin_list = cg.get_coins_list()
        
        if not coin_list:
            logger.error("No coins returned from CoinGecko")
            return {"status": "error", "message": "No coins from API"}
        
        # Clear existing coins and insert new ones
        db.query(Coin).delete()
        db.commit()
        
        added_count = 0
        for coin in coin_list:
            try:
                db.add(Coin(
                    coin_id=coin["id"],
                    symbol=coin["symbol"].upper()
                ))
                added_count += 1
            except Exception as e:
                logger.warning(f"Error adding coin {coin.get('id')}: {e}")
                continue
        
        db.commit()
        
        logger.info(f"Successfully updated {added_count} coins in database")
        return {"status": "success", "coins_count": added_count}
        
    except Exception as e:
        logger.error(f"Error updating coins list: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

