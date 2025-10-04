import os
from celery import Celery


rabbit = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")


celery_app = Celery(
    "tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery.autodiscover_tasks(["app.tasks"])

celery.conf.beat_schedule = {
    'fetch-prices-every-minute': {
        'task': 'app.tasks.fetch_and_store_prices',
        'schedule': 60.0,
    },
}