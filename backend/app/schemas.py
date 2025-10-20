from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True

class WatchlistItemCreate(BaseModel):
    symbol: str

class WatchlistItemOut(BaseModel):
    id: int
    symbol: str
    coin_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class AlertItemCreate(BaseModel):
    symbol: str
    target_price: float

class AlertItemOut(BaseModel):
    id: int
    symbol: str
    target_price: float
    created_at: datetime

    class Config:
        from_attributes = True

class PricePointOut(BaseModel):
    symbol: str
    price: float
    timestamp: datetime

    class Config:
        from_attributes = True

class CoinOut(BaseModel):
    id: int
    coin_id: str
    symbol: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class CostBasisCreate(BaseModel):
    symbol: str
    cost_price: float
    quantity: float

class CostBasisOut(BaseModel):
    id: int
    symbol: str
    cost_price: float
    quantity: float
    created_at: datetime

    class Config:
        from_attributes = True