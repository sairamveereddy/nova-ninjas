import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(".env")
# Use whichever connection string is present
DB_URL = os.environ.get("DATABASE_URL")

if not DB_URL:
    print("No DATABASE_URL found in .env. We must ask the user to run SQL manually.")
else:
    print("Connecting to Supabase Postgres...")
    try:
        conn = psycopg2.connect(DB_URL)
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Executing ALTER TABLE statements...")
        cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes TEXT;")
        cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS platform TEXT;")
        cur.execute("ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;")
        print("Successfully added notes, platform, applied_at to applications table!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error altering schema: {e}")
