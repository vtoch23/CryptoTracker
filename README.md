
# CryptoTracker – Cryptocurrency Portfolio Platform

Full-stack cryptocurrency portfolio management platform with real-time price tracking, alerts, and background data processing.

## Overview
CryptoTracker allows users to track crypto assets, monitor portfolio performance, and receive automated alerts. The project was built to explore scalable backend design, asynchronous task processing, and robust frontend dashboards.

## Tech Stack

**Frontend**
- React 18
- TypeScript
- Vite
- Zustand (state management)
- Tailwind CSS

**Backend**
- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- Celery
- RabbitMQ
- Redis

**Testing & Tooling**
- Cypress (E2E and component testing)
- Storybook
- Docker

## Key Features
- JWT authentication and protected routes
- Real-time crypto price updates
- Portfolio P&L calculations
- Automated background tasks for hourly data updates
- Email notifications and alerts
- Responsive dashboard with charts and analytics

## Architecture & Design
- FastAPI backend with modular route structure
- Background workers using Celery and RabbitMQ
- Redis used for caching frequently accessed data
- Frontend state managed with Zustand
- Clean separation between API, workers, and UI

## Testing
- Cypress E2E and component tests
- Component-driven development with Storybook

## Getting Started

```bash
git clone https://github.com/vtoch23/CryptoTracker.git
cd CryptoTracker
docker compose up --build
