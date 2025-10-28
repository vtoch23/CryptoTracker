"""
Migration script to add 'order' column to watchlist table.
Run this once to update the database schema.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, SessionLocal

def migrate():
    """Add order column and initialize with current order"""
    db = SessionLocal()

    try:
        # Check if column already exists (PostgreSQL)
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name='watchlist' AND column_name='order'
        """))
        columns = [row[0] for row in result.fetchall()]

        if 'order' in columns:
            print("✓ Column 'order' already exists in watchlist table")
            return

        # Add the order column
        print("Adding 'order' column to watchlist table...")
        db.execute(text('ALTER TABLE watchlist ADD COLUMN "order" INTEGER DEFAULT 0'))
        db.commit()

        # Initialize order values based on current id order (per user)
        print("Initializing order values for existing records...")
        db.execute(text("""
            UPDATE watchlist w1
            SET "order" = (
                SELECT COUNT(*) - 1
                FROM watchlist w2
                WHERE w2.user_id = w1.user_id
                AND w2.id <= w1.id
            )
        """))
        db.commit()

        print("✓ Migration completed successfully!")

        # Show current state
        result = db.execute(text('SELECT id, user_id, symbol, "order" FROM watchlist ORDER BY user_id, "order"'))
        rows = result.fetchall()
        if rows:
            print("\nCurrent watchlist order:")
            for row in rows:
                print(f"  ID: {row[0]}, User: {row[1]}, Symbol: {row[2]}, Order: {row[3]}")

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
