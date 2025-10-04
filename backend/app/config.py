from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@localhost:5672//")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "rpc://")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
