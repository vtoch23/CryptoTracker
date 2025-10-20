from celery import Celery
from app.config import settings

app = Celery(
    "tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.autodiscover_tasks([
    "app.tasks.fetch_and_store_prices",
    "app.tasks.check_price_alerts"
])

print("Celery app initialized")

app.conf.beat_schedule = {
    "update-coins-list-weekly": {
        "task": "app.tasks.update_coins_list",
        "schedule": 604800.0,  # Every 7 days (604800 seconds)
    },
    "fetch-prices-every-10-minutes": {
        "task": "app.tasks.fetch_and_store_prices",
        "schedule": 600.0,  # Every 10 minutes
    },
    "check-price-alerts": {
        "task": "app.tasks.check_price_alerts",
        "schedule": 605.0,  # Every 10 minutes + 5 seconds (runs after fetch)
    },
}

app.conf.timezone = "UTC"