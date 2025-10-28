Application Overview
- CryptoTracker is a full-stack cryptocurrency portfolio management platform that allows users to:
- Track cryptocurrency prices in real-time
- Set price alerts with email notifications
- Manage a personal portfolio with profit/loss calculations
- View market trends, gainers, and losers
- Analyze historical price data with OHLC candle charts

Tech Stack

Frontend:

React 18 + TypeScript + Vite
Tailwind CSS for styling
React Router v6 for navigation
Axios for API calls
Lucide React for icons

Backend:

**FastAPI** (Python)
**PostgreSQL** (database)
**SQLAlchemy** ORM
**Celery** (background tasks) + RabbitMQ (message broker)
**Redis** (caching)
**JWT authentication** with Argon2 password hashing
**CoinGecko API integration**

Architecture Highlights

11 Database Models:

User - Authentication and account management
**WatchlistItem** - User's tracked cryptocurrencies
**AlertsItem** - Price target notifications
**PricePoint** - Historical price snapshots
**CostBasis** - Purchase records for portfolio tracking
**Coin** - Available cryptocurrency reference data
**Top100** - Top 100 cryptocurrencies by market cap
**TrendingCoin** - Trending coins from CoinGecko
**TopGainerLoser** - Top 24h gainers/losers
**CoinHistory** - OHLC historical data
**OHLCCache** (inferred from usage)

Key API Endpoints:

/auth/* - Login/Register with JWT tokens
/watchlist/* - Add/remove tracked coins
/alerts/* - Price alert management
/prices/* - Latest and historical price data
/charts/* - OHLC candle chart data
/cost-basis/* - Portfolio purchase tracking
/market/* - Trending coins, gainers/losers
/fetch/* - Manual price refresh
Background Tasks (Celery):
Hourly price fetching from CoinGecko (every hour at :20)
Alert checking and email notifications
Market data updates (currently disabled)

Data Flow

User clicks "Refresh Prices"
    ↓
Frontend calls /prices/ endpoint
    ↓
Backend triggers Celery task
    ↓
Celery fetches from CoinGecko API
    ↓
Prices stored in PostgreSQL
    ↓
Alert checking runs automatically
    ↓
Email sent if alert triggered
    ↓
Frontend displays updated prices

Frontend Structure

Main Pages:

Auth/Login.tsx & Auth/Register.tsx - Authentication
Dashboard.tsx - Main hub with tabs:
Dashboard Tab: Watchlist, add coins/purchases, markets sidebar
Portfolio Tab: P&L calculations by purchase
Watchlist Tab: Full watchlist view
Markets Tab: Trending coins, gainers/losers
Alerts Tab: All price alerts grouped by status
PortfolioDisplay.tsx - Portfolio P&L analysis

Key Components:

WatchlistDisplay.tsx - Main watchlist with charts
MarketDisplay.tsx - Market trends visualization
AlertsGrouped.tsx - Alert management
CandleChart.tsx - OHLC chart visualization
SearchableDropdown.tsx - Coin selector
Security Features
JWT token authentication
Argon2 password hashing
OAuth2 Bearer token scheme
Protected API routes with dependency injection
CORS configured for specific origins
Password validation (8+ characters)

Key Features

Watchlist Management - Add/remove coins with drag-and-drop reordering
Price Alerts - Email notifications when target prices are hit
Portfolio Tracking - Track purchases with real-time P&L calculations
OHLC Charts - 7-day candle charts for technical analysis
Market Overview - Trending coins, top gainers/losers
Historical Data - Price history with timestamps
Automated Updates - Hourly price fetching via Celery

File Structure

/backend/app/
  ├── main.py (FastAPI entry)
  ├── models.py (11 database tables)
  ├── routes/ (7 route modules)
  ├── tasks/ (Celery background jobs)
  └── worker/celery_app.py (scheduling)

/frontend/src/
  ├── App.tsx (router + protected routes)
  ├── pages/ (auth, dashboard, portfolio)
  ├── components/ (reusable UI)
  └── api/ (HTTP client functions)

# CryptoTracker Frontend

This is the React frontend for CryptoTracker, using:

- **React 18**
- **Vite**
- **TypeScript**
- **Zustand** for state management
- **React Router v6**
- **Storybook** for component development
- **Cypress** for E2E and component testing

---

## Running the App Locally

### 1. Start the backend

Make sure backend, Celery, RabbitMQ (port `5433`) and database are running in Docker.

cd ../backend
docker compose up -d  # or your existing command

#### to restart
docker-compose down && docker-compose up --build -d

## 2. Start the frontend

cd frontend
npm install
npm run dev


## 3. Start Storybook

Start Storybook (for components):
npm run storybook


Build Storybook for deployment:
npm run build-storybook

Storybook runs on http://localhost:6006

## 4. Start Cypress
Open Cypress Test Runner (E2E)
npx cypress open


Use the e2e folder for integration tests.

Use the component folder for React component testing.

Run all Cypress tests headlessly
npx cypress run



**Backend**

## Setup & Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 16+
- RabbitMQ (for Celery)
- Redis (for caching)
- CoinGecko API key (optional, for higher rate limits)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CryptoTracker/backend
```



### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL=postgresql+psycopg2://crypto_user:crypto_pass@localhost:5433/crypto

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CoinGecko API
COINGECKO_API_KEY=your-api-key-here
COINGECKO_PRICE_URL=https://api.coingecko.com/api/v3

# Message Queue
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
CELERY_BROKER_URL=amqp://guest:guest@localhost:5672//
CELERY_RESULT_BACKEND=rpc://

# Cache
REDIS_URL=redis://localhost:6379/0

# Email (SMTP for price alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=''
SMTP_TLS=True

# Docker Detection (auto-configured)
RUNNING_IN_DOCKER=false
DEBUG=True
```

### 5. Start Infrastructure Services

#### Option A: Docker Compose (Recommended)

```bash
docker-compose up -d



This starts:
- PostgreSQL on port `5433`
- RabbitMQ on port `5672` (management UI: `15672`)
- Redis on port `6379`

#### Option B: Manual Setup

Start each service separately:

```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE crypto;"
psql -U postgres -c "CREATE USER crypto_user WITH PASSWORD 'crypto_pass';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE crypto TO crypto_user;"

# RabbitMQ
brew services start rabbitmq  # macOS
# or
sudo systemctl start rabbitmq-server  # Linux

# Redis
brew services start redis  # macOS
# or
sudo systemctl start redis  # Linux
```

### 6. Initialize Database

```bash

# initialize tables
python -m app.init_db
```

---



## Running the Application

### 1. Start the FastAPI Server

```bash
# Development mode (auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### to kill uvicorn process
lsof -i :8000 | grep LISTEN
kill -9 pid && sleep 1 && lsof -i :8000 | grep LISTEN || echo "Port 80

API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 2. Start Celery Worker

In a separate terminal:

```bash
celery -A app.worker.celery_app worker --loglevel=info
```

### 3. Start Celery Beat (Scheduler)

In another terminal:

```bash
celery -A app.worker.celery_app beat --loglevel=info
```

### All-in-One Development Command

```bash
# Terminal 1: FastAPI
uvicorn app.main:app --reload

# Terminal 2: Celery Worker
celery -A app.worker.celery_app worker --loglevel=info

# Terminal 3: Celery Beat
celery -A app.worker.celery_app beat --loglevel=info
```

---


## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/auth/register` | Create new user account | No |
| `POST` | `/auth/token` | Login and receive JWT token | No |

### Watchlist Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/watchlist/` | Get user's watchlist | Yes |
| `POST` | `/watchlist/` | Add coin to watchlist | Yes |
| `DELETE` | `/watchlist/{item_id}` | Remove coin from watchlist | Yes |

### Price Alert Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/alerts/` | Get user's price alerts | Yes |
| `POST` | `/alerts/` | Create new price alert | Yes |
| `DELETE` | `/alerts/{alert_id}` | Delete price alert | Yes |

### Price Data Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/prices/` | Get latest prices for watchlist | Yes |
| `GET` | `/prices/{symbol}` | Get price history for symbol | Yes |
| `GET` | `/fetch/` | Manual price refresh from CoinGecko | Yes |

### Chart Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/charts/available-coins` | Get all available coins | Yes |
| `GET` | `/charts/chart/{coin_id}?days=30&interval=4h` | Get OHLC candle data | Yes |
| `GET` | `/charts/history/{coin_id}?days=30` | Get OHLC history table data | Yes |

### Portfolio Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/cost-basis/` | Get user's purchase records | Yes |
| `POST` | `/cost-basis/` | Add new purchase | Yes |
| `PATCH` | `/cost-basis/{item_id}` | Update purchase record | Yes |
| `DELETE` | `/cost-basis/{item_id}` | Delete purchase record | Yes |

### Market Data Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/market/prices` | Get Top 100 prices (cached) | Yes |
| `GET` | `/market/trending` | Get trending coins | Yes |
| `GET` | `/market/top-gainers-losers` | Get top gainers/losers | Yes |

### Example API Requests

#### Register User

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

#### Login

```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=securepassword123"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Add Coin to Watchlist

```bash
curl -X POST "http://localhost:8000/watchlist/" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "coin_id": "bitcoin"
  }'
```

#### Create Price Alert

```bash
curl -X POST "http://localhost:8000/alerts/" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC",
    "target_price": 50000.00
  }'
```

---

## Database Models

### User
- **Fields**: `id`, `email`, `hashed_password`, `is_active`, `created_at`
- **Purpose**: User authentication and account management

### WatchlistItem
- **Fields**: `id`, `user_id`, `symbol`, `coin_id`, `created_at`
- **Purpose**: User's tracked cryptocurrencies
- **Relationship**: Many-to-one with User

### AlertsItem
- **Fields**: `id`, `user_id`, `symbol`, `target_price`, `created_at`
- **Purpose**: Price target notifications
- **Relationship**: Many-to-one with User

### PricePoint
- **Fields**: `id`, `symbol`, `price`, `timestamp`
- **Purpose**: Historical price snapshots
- **Indexed**: `symbol`, `timestamp` for fast queries

### CostBasis
- **Fields**: `id`, `user_id`, `symbol`, `cost_price`, `quantity`, `created_at`
- **Purpose**: Portfolio purchase tracking for P&L calculations
- **Relationship**: Many-to-one with User

### Coin
- **Fields**: `id`, `coin_id`, `symbol`, `name`
- **Purpose**: Available cryptocurrency reference data

### Top100
- **Fields**: `id`, `coin_id`, `symbol`, `market_cap_rank`
- **Purpose**: Top 100 cryptocurrencies by market cap

### TrendingCoin
- **Fields**: `id`, `coin_id`, `coin_gecko_id`, `name`, `symbol`, `market_cap_rank`, `thumb`, `price_btc`, `rank`, `updated_at`
- **Purpose**: Trending coins from CoinGecko

### TopGainerLoser
- **Fields**: `id`, `coin_id`, `symbol`, `name`, `image`, `market_cap_rank`, `current_price`, `price_change_percentage_24h`, `is_gainer`, `updated_at`
- **Purpose**: Top gainers and losers (24h)

### CoinHistory
- **Fields**: `id`, `coin_id`, `symbol`, `date`, `timestamp`, `open`, `high`, `low`, `close`
- **Purpose**: OHLC (Open, High, Low, Close) historical data for charts

### Relationships

```
User (1) ─── (M) WatchlistItem
User (1) ─── (M) AlertsItem
User (1) ─── (M) CostBasis

WatchlistItem (M) ─── (1) Coin (via coin_id)
```

---

## Background Tasks

### Celery Beat Schedule

Configured in `app/worker/celery_app.py`:

| Task | Schedule | Purpose |
|------|----------|---------|
| `fetch_and_store_prices` | Every hour at :20 | Fetch prices from CoinGecko for all watchlist coins |
| `check_price_alerts` | After price fetch | Check alerts and send email notifications |

### Task Details

#### 1. `fetch_and_store_prices` ([tasks/fetch_and_store_prices.py](app/tasks/fetch_and_store_prices.py))

```python
@shared_task
def fetch_and_store_prices():
    # 1. Query all unique coin_ids from users' watchlists
    # 2. Call CoinGecko API in batches (max 10 coins per request)
    # 3. Store price points with timestamps
    # 4. Automatically trigger check_price_alerts()
```

**Features:**
- Rate limit protection (batches of 10 coins)
- Error handling and logging
- Automatic alert checking after completion

#### 2. `check_price_alerts` ([tasks/check_price_alerts.py](app/tasks/check_price_alerts.py))

```python
@shared_task
def check_price_alerts():
    # 1. Retrieve latest price for each symbol
    # 2. Compare against alert targets
    # 3. Send HTML email notifications
    # 4. Delete triggered alerts
```

**Email Template:**
- Professional HTML with gradient header
- Price details and percentage change
- Call-to-action button
- Responsive design

---

## Authentication

### JWT Token Authentication

**Flow:**
1. User registers with email and password
2. Password hashed with Argon2
3. User logs in with credentials
4. Server generates JWT token (HS256 algorithm)
5. Token expires after 24 hours (configurable)
6. Client includes token in `Authorization: Bearer <token>` header

### Password Security

- **Hashing Algorithm**: Argon2 (industry standard)
- **Validation**: 8-72 character password length
- **No plaintext storage**: Only hashed passwords in database

### Protected Routes

Use the `get_current_user` dependency:

```python
from app.dependencies import get_current_user

@router.get("/protected")
async def protected_route(current_user: User = Depends(get_current_user)):
    return {"user": current_user.email}
```

### CORS Configuration

Allowed origins (configured in `main.py`):
- `http://localhost:4200`
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`

All HTTP methods and headers are allowed for these origins.

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg2://...` | Yes |
| `SECRET_KEY` | JWT signing secret | - | Yes |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `1440` (24h) | No |
| `COINGECKO_API_KEY` | CoinGecko API key | - | No |
| `COINGECKO_PRICE_URL` | CoinGecko API base URL | - | No |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://guest:guest@localhost:5672/` | Yes |
| `CELERY_BROKER_URL` | Celery broker URL | `amqp://guest:guest@localhost:5672//` | Yes |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` | Yes |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` | Yes |
| `SMTP_PORT` | SMTP server port | `587` | Yes |
| `SMTP_USER` | SMTP username | - | Yes |
| `SMTP_PASSWORD` | SMTP password | - | Yes |
| `SMTP_FROM_EMAIL` | Email sender address | `noreply@cryptotracker.com` | No |
| `SMTP_TLS` | Enable TLS for SMTP | `True` | No |
| `RUNNING_IN_DOCKER` | Docker environment flag | Auto-detected | No |

### Docker Auto-Detection

The application automatically detects if running in Docker and adjusts connection strings:

```python
if running_in_docker():
    DATABASE_URL = "postgresql+psycopg2://postgres:password@db:5432/cryptotracker"
    REDIS_URL = "redis://redis:6379/0"
    RABBITMQ_URL = "amqp://guest:guest@rabbitmq:5672//"
```

---

## Development

### Database Migrations with Alembic

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history
```

### Code Style

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Database Inspection

```bash
# Connect to PostgreSQL
psql -U crypto_user -d crypto -h localhost -p 5433

# List tables
\dt

# Describe table
\d watchlistitems

# Query data
SELECT * FROM users;
```

### Celery Monitoring

```bash
# View active tasks
celery -A app.worker.celery_app inspect active

# View registered tasks
celery -A app.worker.celery_app inspect registered

# Purge all tasks
celery -A app.worker.celery_app purge
```

### RabbitMQ Management UI

Access at: http://localhost:15672
- **Username**: `guest`
- **Password**: `guest`

---

## Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Test Structure

```
tests/
├── test_auth.py          # Authentication tests
├── test_watchlist.py     # Watchlist CRUD tests
├── test_alerts.py        # Alert management tests
├── test_prices.py        # Price fetching tests
└── conftest.py           # Test fixtures
```

### Manual API Testing

Use the interactive Swagger UI at http://localhost:8000/docs:
1. Click "Authorize" button
2. Enter JWT token from `/auth/token`
3. Test endpoints interactively

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

```
Error: could not connect to server: Connection refused
```

**Solution:**
- Ensure PostgreSQL is running: `docker-compose up -d db`
- Check port 5433 is not in use: `lsof -i :5433`
- Verify DATABASE_URL in `.env`

#### 2. Celery Worker Not Starting

```
Error: Consumer: Cannot connect to amqp://guest:**@localhost:5672//
```

**Solution:**
- Start RabbitMQ: `docker-compose up -d rabbitmq`
- Check RabbitMQ status: `docker-compose ps`

#### 3. CoinGecko API Rate Limit

```
Error: 429 Too Many Requests
```

**Solution:**
- Add `COINGECKO_API_KEY` to `.env`
- Reduce task frequency in `celery_app.py`

#### 4. Email Notifications Not Sending

**Solution:**
- Enable "Less secure app access" for Gmail (or use App Password)
- Verify SMTP credentials in `.env`
- Check spam folder

---

## Production Deployment

### Docker Production Build

```bash
# Build image
docker build -t cryptotracker-backend .

# Run container
docker run -d \
  --name cryptotracker-api \
  -p 8000:8000 \
  --env-file .env \
  cryptotracker-backend
```

### Environment-Specific Settings

```bash
# Production
export DEBUG=False
export RUNNING_IN_DOCKER=true

# Use stronger SECRET_KEY
export SECRET_KEY=$(openssl rand -hex 32)
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name api.cryptotracker.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Contributing

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test thoroughly
3. Run tests: `pytest`
4. Commit changes: `git commit -m "Add new feature"`
5. Push branch: `git push origin feature/new-feature`
6. Create pull request


---


**Built with FastAPI, PostgreSQL, and Celery**