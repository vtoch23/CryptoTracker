# app/worker/celery_app.py
from celery import Celery
from app.config import settings

app = Celery(
    "tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.autodiscover_tasks(["app.tasks"])
print("Celery app initialized")

app.conf.beat_schedule = {
    "fetch-prices-every-5-minutes": {
        "task": "app.tasks.fetch_and_store_prices",
        "schedule": 300.0,
    },
}

app.conf.timezone = "UTC"