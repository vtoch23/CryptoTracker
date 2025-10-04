from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.watchlist import router as watchlist_router
from app.routes.prices import router as prices_router

app = FastAPI(title="CryptoTracker API")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # your Angular frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Include your API routers ---
app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(prices_router)
