# app/worker/run_tasks.py
from app.tasks.prices import update_prices

if __name__ == "__main__":
    update_prices.delay()  # Trigger the task