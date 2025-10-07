from app.database import SessionLocal
from app.models import WatchlistItem, PricePoint, User
from sqlalchemy import func
from celery import shared_task
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

@shared_task(name="app.tasks.check_price_alerts")
def check_price_alerts():
    """
    Check all watchlist items and send notifications when target prices are met.
    """
    db = SessionLocal()
    try:
        # Get all watchlist items with target prices
        watchlist_items = (
            db.query(WatchlistItem)
            .filter(WatchlistItem.target_price.isnot(None))
            .all()
        )

        if not watchlist_items:
            logger.info("No watchlist items with target prices")
            return {"status": "success", "alerts_sent": 0}

        # Get latest prices - using the same reliable query as your endpoint
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
        
        for item in watchlist_items:
            alerts_checked += 1
            # Normalize symbol to uppercase for lookup
            symbol_upper = item.symbol.upper()
            current_price = price_dict.get(symbol_upper)
            
            if current_price is None:
                logger.warning(f"No price found for {symbol_upper}")
                continue

            target_price = item.target_price
            
            # Check if target price is met
            if current_price >= target_price:
                user = db.query(User).filter(User.id == item.user_id).first()
                
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
                        logger.info(f"📧 Alert sent to {user.email} for {symbol_upper}: ${current_price:.2f} >= ${target_price:.2f}")
                        
                        # Remove from watchlist after alert (or you can keep it)
                        db.delete(item)
                        
                    except Exception as e:
                        logger.error(f"Failed to send alert to {user.email}: {e}")

        db.commit()
        logger.info(f"✅ Checked {alerts_checked} watchlist items, sent {alerts_sent} alerts")
        return {"status": "success", "checked": alerts_checked, "alerts_sent": alerts_sent}

    except Exception as e:
        logger.error(f"❌ Error checking price alerts: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()


def send_price_alert_email(user_email: str, symbol: str, current_price: float, target_price: float):
    """Send email notification when price target is reached."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f'🚨 {symbol} Price Alert: ${current_price:,.2f}'
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
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎯 Price Target Reached!</h1>
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
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="padding: 12px 0; color: #64748b; font-size: 15px;">Exceeded By</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #10b981; font-size: 16px;">+${price_change:.2f}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- Call to Action -->
                <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                  <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                    <strong>💡 What's next?</strong><br>
                    Your {symbol} target has been reached. Consider reviewing your investment strategy.
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 24px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                  Automated alert from Crypto Price Tracker
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  This watchlist item has been removed after triggering this alert
                </p>
              </div>
            </div>
          </body>
        </html>
        """

        text = f"""
🎯 PRICE ALERT: {symbol}

Your target price has been reached!

Current Price:    ${current_price:,.2f}
Your Target:      ${target_price:,.2f}
Exceeded By:      +${price_change:.2f} ({price_change_pct:+.2f}%)

────────────────────────────────

This is an automated alert from Crypto Price Tracker.
This watchlist item has been removed after triggering this alert.
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
            
        logger.info(f"✉️  Email sent successfully to {user_email}")

    except Exception as e:
        logger.error(f"Failed to send email to {user_email}: {e}")
        raise