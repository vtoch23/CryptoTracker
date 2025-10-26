"""
Celery Beat Schedule Configuration

This file defines the periodic tasks that should be run by Celery Beat.
To run the beat scheduler, use:
    celery -A celery_app beat --loglevel=info

To run the worker, use:
    celery -A celery_app worker --loglevel=info
"""

from celery import Celery
from celery.schedules import crontab
from app.config import settings

# Initialize Celery
celery_app = Celery(
    'crypto_tracker',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
)

# Import tasks to register them
from app.tasks.fetch_and_store_prices import fetch_and_store_prices, update_coins_list
from app.tasks.check_price_alerts import check_price_alerts
# from app.tasks.fetch_market_data import fetch_trending_coins, fetch_top_gainers_losers

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    # Fetch prices every hour
    'fetch-prices-every-hour': {
        'task': 'app.tasks.fetch_and_store_prices',
        'schedule': crontab(minute='20'),  
    },
    
    # # Check price alerts every hour
    # 'check-alerts-every-hour': {
    #     'task': 'app.tasks.check_price_alerts',
    #     'schedule': crontab(minute='12'),  
    # },
    
    # Update coins list once a month 
    # 'update-coins-list-monthly': {
    #     'task': 'app.tasks.update_coins_list',
    #     'schedule': crontab(0, 0, day_of_month='1'), 
    # },
    
    # Fetch trending coins every day
    # 'fetch-trending-coins-daily': {
    #     'task': 'app.tasks.fetch_trending_coins',
    #     'schedule': crontab(hour=0),  
    # },
    
    # # Fetch top gainers and losers every day
    # 'fetch-gainers-losers-daily': {
    #     'task': 'app.tasks.fetch_top_gainers_losers',
    #     'schedule': crontab(hour=5),  # Every hour at minute 5
    # },
}

if __name__ == '__main__':
    celery_app.start()