from celery import Celery
from app.config import settings

celery_app = Celery(
    "tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Auto-discover tasks in your app
celery_app.autodiscover_tasks(["app.tasks"])

# Optional: periodic tasks
celery_app.conf.beat_schedule = {
    "fetch-prices-every-minute": {
        "task": "app.tasks.fetch_and_store_prices",
        "schedule": 60.0,
    },
}
