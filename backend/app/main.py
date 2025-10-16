from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.watchlist import router as watchlist_router
from app.routes.alerts import router as alerts_router
from app.routes.prices import router as prices_router
from app.routes.fetch import router as fetch_router
from app.routes import cost_basis

app = FastAPI(title="CryptoTracker API", debug=True)

from app.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(alerts_router) 
app.include_router(prices_router)
app.include_router(fetch_router)
app.include_router(cost_basis.router)