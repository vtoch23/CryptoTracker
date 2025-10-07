from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Load environment file first
load_dotenv(override=True)


def running_in_docker() -> bool:
    """Detect if the app is running inside a Docker container."""
    # Docker sets this file in all containers
    if os.path.exists("/.dockerenv"):
        return True
    # Common environment variables used in Docker compose
    if os.getenv("DOCKER_CONTAINER") or os.getenv("RUNNING_IN_DOCKER"):
        return True
    return False


class Settings(BaseSettings):
    # Default local config
    DATABASE_URL: str = "postgresql+psycopg2://crypto_user:crypto_pass@localhost:5433/crypto"
    SECRET_KEY: str = "supersecretkey"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CELERY_BROKER_URL: str = "amqp://guest:guest@localhost:5672//"
    CELERY_RESULT_BACKEND: str = "rpc://"
    REDIS_URL: str = "redis://localhost:6379/0"
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# 👇 Dynamically adjust URLs when running inside Docker
if running_in_docker():
    print("⚙️ Running inside Docker — using container networking")
    settings.DATABASE_URL = "postgresql+psycopg2://postgres:password@db:5432/cryptotracker"
    settings.REDIS_URL = "redis://redis:6379/0"
    settings.RABBITMQ_URL = "amqp://guest:guest@rabbitmq:5672//"
    settings.CELERY_BROKER_URL = settings.RABBITMQ_URL
else:
    print("🧑‍💻 Running locally — using localhost networking")
    # Only override if .env is missing
    settings.DATABASE_URL = "postgresql+psycopg2://crypto_user:crypto_pass@localhost:5433/crypto"
    settings.REDIS_URL = settings.REDIS_URL or "redis://localhost:6379/0"
    settings.RABBITMQ_URL = settings.RABBITMQ_URL or "amqp://guest:guest@localhost:5672//"
    settings.CELERY_BROKER_URL = settings.CELERY_BROKER_URL or settings.RABBITMQ_URL
