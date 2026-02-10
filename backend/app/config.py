from pydantic_settings import BaseSettings
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)


def running_in_docker() -> bool:
    if os.path.exists("/.dockerenv"):
        return True

    # Check env vars (must parse string to boolean properly)
    docker_container = os.getenv("DOCKER_CONTAINER", "").lower() in ("true", "1", "yes")
    running_in_docker_env = os.getenv("RUNNING_IN_DOCKER", "").lower() in ("true", "1", "yes")

    if docker_container or running_in_docker_env:
        return True

    return False


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv('DATABASE_URL')
    SECRET_KEY: str = os.getenv('SECRET_KEY')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1
    COINGECKO_API_KEY: str = os.getenv('CoinGecko_API_KEY')
    COINGECKO_PRICE_URL: str = os.getenv('COINGECKO_PRICE_URL')

    CELERY_BROKER_URL: str = os.getenv('CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND: str = "rpc://"
    REDIS_URL: str = os.getenv('REDIS_URL')
    RABBITMQ_URL: str = os.getenv('RABBITMQ_URL')

    SMTP_HOST: str = os.getenv('SMTP_HOST')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', 587))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL: str = os.getenv('SMTP_FROM_EMAIL')
    SMTP_TLS: bool = os.getenv('SMTP_TLS', 'true').lower() == 'true'
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

if running_in_docker():
    print("Running inside Docker — using container networking")
    settings.DATABASE_URL = os.getenv('DATABASE_URL_DOCKER')
    settings.REDIS_URL = os.getenv('REDIS_URL_DOCKER')
    settings.RABBITMQ_URL = os.getenv('RABBITMQ_URL_DOCKER')
    settings.CELERY_BROKER_URL = settings.RABBITMQ_URL
else:
    print("Running locally — using localhost networking")
    settings.DATABASE_URL = settings.DATABASE_URL or os.getenv('DATABASE_URL')
    settings.REDIS_URL = settings.REDIS_URL or os.getenv('REDIS_URL')
    settings.RABBITMQ_URL = settings.RABBITMQ_URL or os.getenv('RABBITMQ_URL')
    settings.CELERY_BROKER_URL = settings.CELERY_BROKER_URL or settings.RABBITMQ_URL
