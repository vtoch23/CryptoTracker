# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, watchlist, prices  # import your routers

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
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
app.include_router(prices.router, prefix="/prices", tags=["prices"])
