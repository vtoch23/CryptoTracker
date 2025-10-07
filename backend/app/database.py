# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
    pool_size=10,  # Adjust based on load
    max_overflow=20,
    pool_timeout=30,
    pool_pre_ping=True  # Test connections before use
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)