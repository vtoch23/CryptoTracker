uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

docker-compose up --build

celery -A app.worker.celery_app worker --beat --scheduler django --loglevel=info


ng serve

