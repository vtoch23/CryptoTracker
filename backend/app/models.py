from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

class WatchlistItem(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    coin_id = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertsItem(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    target_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PricePoint(Base):
    __tablename__ = "price_points"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    price = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

class CostBasis(Base):
    __tablename__ = "cost_basis"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    symbol = Column(String, index=True)
    cost_price = Column(Float)
    quantity = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class Coin(Base):
    __tablename__ = "coins"
    id = Column(Integer, primary_key=True, index=True)
    coin_id = Column(String, unique=True, index=True)
    symbol = Column(String, index=True)

class TrendingCoin(Base):
    __tablename__ = "trending_coins"
    id = Column(Integer, primary_key=True, index=True)
    coin_id = Column(String, index=True)  # Internal identifier
    coin_gecko_id = Column(Integer) 
    name = Column(String)
    symbol = Column(String)
    market_cap_rank = Column(Integer)
    thumb = Column(String)  # Thumbnail image URL
    price_btc = Column(Float)
    rank = Column(Integer) 
    updated_at = Column(DateTime, default=datetime.utcnow)

class TopGainerLoser(Base):
    __tablename__ = "top_gainers_losers"
    id = Column(Integer, primary_key=True, index=True)
    coin_id = Column(String, index=True)
    symbol = Column(String)
    name = Column(String)
    image = Column(String)
    market_cap_rank = Column(Integer)
    current_price = Column(Float)
    price_change_percentage_24h = Column(Float)
    is_gainer = Column(Boolean)  # True for gainer, False for loser
    updated_at = Column(DateTime, default=datetime.utcnow)