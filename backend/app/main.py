import logging
import logging.handlers
import os
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.auth import router as auth_router
from app.routes.watchlist import router as watchlist_router
from app.routes.alerts import router as alerts_router
from app.routes.prices import router as prices_router
from app.routes.fetch import router as fetch_router
from app.routes import cost_basis
from app.routes import charts
from app.routes import market  
from app.init_db import initialize_database

LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

log_filename = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")

# Create root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)

# File handler
file_handler = logging.FileHandler(log_filename)
file_handler.setLevel(logging.DEBUG)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# Formatter
formatter = logging.Formatter(
    '%(asctime)s | %(name)s | %(levelname)-8s | %(funcName)s:%(lineno)d | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

# Get logger for this module
logger = logging.getLogger(__name__)
logger.info("=" * 100)
logger.info(f"Application started - Logs will be written to: {log_filename}")
logger.info("=" * 100)

app = FastAPI(title="CryptoTracker API", debug=True)

from app.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("CORS middleware configured")

app.include_router(auth_router)
app.include_router(watchlist_router)
app.include_router(alerts_router) 
app.include_router(prices_router)
app.include_router(fetch_router)
app.include_router(cost_basis.router)
app.include_router(charts.router)
app.include_router(market.router) 

logger.info("All routers included successfully")


@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI startup event triggered")
    initialize_database()




@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI shutdown event triggered")