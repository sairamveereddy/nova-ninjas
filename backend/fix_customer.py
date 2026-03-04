"""Add missing subscription columns to live Supabase and fix customer."""
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from supabase import create_client
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
sb = create_client(url, key)

# Step 1: Add missing columns via raw SQL
print("Adding missing columns...")
try:
    sb.rpc("exec_sql", {"query": """
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
    """}).execute()
    print("Columns added via RPC")
except Exception as e:
    print(f"RPC failed (expected if exec_sql doesn't exist): {e}")
    print("You need to run the following SQL in the Supabase SQL Editor:")
    print("""
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMPTZ;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;
    """)

# Step 2: Try updating subscription_status again
email = "satyanarayanachav@gmail.com"
print(f"\nAttempting to set {email} subscription_status to active...")
try:
    result = sb.table("profiles").update({"subscription_status": "active"}).eq("email", email).execute()
    print(f"Direct update result: {result.data}")
except Exception as e:
    print(f"Direct update failed: {e}")

# Step 3: Verify
user = sb.table("profiles").select("email, plan, subscription_status, plan_expires_at").eq("email", email).execute()
if user.data:
    print(f"\nFinal state: {user.data[0]}")
else:
    print("User not found")
