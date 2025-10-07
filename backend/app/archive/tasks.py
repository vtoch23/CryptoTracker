from celery import Celery
from app.config import settings
import httpx

celery_app = Celery("tasks", broker=settings.CELERY_BROKER_URL, backend=settings.CELERY_RESULT_BACKEND)

@celery_app.task
def check_crypto_prices():
    # fetch prices from public API and send alerts
    print("Checking crypto prices...")
