import os
from celery import Celery


rabbit = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672//")
redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")


celery = Celery(
"crypto_tasks",
broker=rabbit,
backend=redis_url,
)


celery.conf.beat_schedule = {
    'fetch-prices-every-minute': {
        'task': 'app.tasks.fetch_and_store_prices',
        'schedule': 60.0,
    },
}