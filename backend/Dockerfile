# Railway-compatible Dockerfile for FastAPI backend
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app /app/app

# Expose port (Railway will set PORT env variable)
EXPOSE 8000

# Use Railway's PORT environment variable
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}