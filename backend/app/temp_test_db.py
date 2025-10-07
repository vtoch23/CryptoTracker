# temp_test_db.py
from sqlalchemy import create_engine
from .config import settings

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as connection:
    print("Database connection successful!")