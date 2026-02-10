from pydantic_settings import BaseSettings
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root (two levels up from this file)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)


def running_in_railway() -> bool:
    """Detect if running in Railway environment"""
    return os.getenv("RAILWAY_ENVIRONMENT") is not None


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
    # Railway will provide DATABASE_URL in the correct format
    DATABASE_URL: str = os.getenv('DATABASE_URL', 'postgresql+psycopg2://crypto_user:crypto_pass@localhost:5433/crypto')
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'supersecretkey')
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '480'))
    COINGECKO_API_KEY: str = os.getenv('CoinGecko_API_KEY', '')
    COINGECKO_PRICE_URL: str = os.getenv('COINGECKO_PRICE_URL', 'https://api.coingecko.com/api/v3/simple/price')

    # For Railway, these will be internal URLs if using Railway services
    CELERY_BROKER_URL: str = os.getenv('CELERY_BROKER_URL', 'amqp://guest:guest@localhost:5672//')
    CELERY_RESULT_BACKEND: str = os.getenv('CELERY_RESULT_BACKEND', 'rpc://')
    REDIS_URL: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    RABBITMQ_URL: str = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672//')

    SMTP_HOST: str = os.getenv('SMTP_HOST', 'smtp.gmail.com')
    SMTP_PORT: int = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USER: str = os.getenv('SMTP_USER', '')
    SMTP_PASSWORD: str = os.getenv('SMTP_PASSWORD', '')
    SMTP_FROM_EMAIL: str = os.getenv('SMTP_FROM_EMAIL', 'noreply@cryptotracker.com')
    SMTP_TLS: bool = os.getenv('SMTP_TLS', 'true').lower() == 'true'
    
    # Railway-specific
    PORT: int = int(os.getenv('PORT', '8000'))
    RAILWAY_ENVIRONMENT: str = os.getenv('RAILWAY_ENVIRONMENT', '')
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Handle Railway DATABASE_URL format (postgres:// vs postgresql://)
if running_in_railway():
    print("Running on Railway — using Railway-provided URLs")
    if settings.DATABASE_URL and settings.DATABASE_URL.startswith('postgres://'):
        # Railway provides postgres:// but SQLAlchemy needs postgresql://
        settings.DATABASE_URL = settings.DATABASE_URL.replace('postgres://', 'postgresql://', 1)
        # Add psycopg2 driver if not present
        if 'postgresql://' in settings.DATABASE_URL and '+psycopg2' not in settings.DATABASE_URL:
            settings.DATABASE_URL = settings.DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)
elif running_in_docker():
    print("Running inside Docker — using container networking")
    settings.DATABASE_URL = os.getenv('DATABASE_URL_DOCKER', settings.DATABASE_URL)
    settings.REDIS_URL = os.getenv('REDIS_URL_DOCKER', settings.REDIS_URL)
    settings.RABBITMQ_URL = os.getenv('RABBITMQ_URL_DOCKER', settings.RABBITMQ_URL)
    settings.CELERY_BROKER_URL = settings.RABBITMQ_URL
else:
    print("Running locally — using localhost networking")
    # Already set from environment or defaults
    pass

print(f"Database URL configured: {settings.DATABASE_URL[:30]}...")  # Only print first 30 chars for security