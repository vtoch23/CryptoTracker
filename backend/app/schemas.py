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
        orm_mode = True

class WatchlistItemCreate(BaseModel):
    symbol: str
    target_price: Optional[float]

class WatchlistItemOut(BaseModel):
    id: int
    symbol: str
    target_price: Optional[float]
    created_at: datetime

    class Config:
        orm_mode = True

class PricePointOut(BaseModel):
    symbol: str
    price: float
    timestamp: datetime

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
