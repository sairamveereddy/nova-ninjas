import os
import logging
from supabase_service import SupabaseService

logging.basicConfig(level=logging.INFO)

def test():
    print("Testing Supabase connection...")
    client = SupabaseService.get_client()
    if client:
        print("✅ Success! Client initialized.")
        # Try a simple select
        try:
            res = client.table("profiles").select("count", count="exact").limit(1).execute()
            print(f"✅ Query success! User count: {res.count}")
        except Exception as e:
            print(f"❌ Query failed: {e}")
    else:
        print("❌ Failed to initialize client. Check env vars.")

if __name__ == "__main__":
    test()
