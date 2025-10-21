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
from app.tasks.fetch_market_data import fetch_trending_coins, fetch_top_gainers_losers

# Celery Beat Schedule
celery_app.conf.beat_schedule = {
    # Fetch prices every 5 minutes
    'fetch-prices-every-5-minutes': {
        'task': 'app.tasks.fetch_and_store_prices',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    
    # Check price alerts every 5 minutes
    'check-alerts-every-5-minutes': {
        'task': 'app.tasks.check_price_alerts',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    
    # Update coins list once a week (Sunday at 3 AM)
    'update-coins-list-weekly': {
        'task': 'app.tasks.update_coins_list',
        'schedule': crontab(hour=3, minute=0, day_of_week=0),  # Sunday 3 AM
    },
    
    # Fetch trending coins every hour
    'fetch-trending-coins-hourly': {
        'task': 'app.tasks.fetch_trending_coins',
        'schedule': crontab(minute=0),  # Every hour at minute 0
    },
    
    # Fetch top gainers and losers every hour
    'fetch-gainers-losers-hourly': {
        'task': 'app.tasks.fetch_top_gainers_losers',
        'schedule': crontab(minute=5),  # Every hour at minute 5
    },
}

if __name__ == '__main__':
    celery_app.start()