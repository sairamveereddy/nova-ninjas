import os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase_service import SupabaseService

client = SupabaseService.get_client()
try:
    # Fetch 1 job to see the keys
    res = client.table("jobs").select("*").limit(1).execute()
    if res.data:
        print(f"Columns in 'jobs' table: {list(res.data[0].keys())}")
    else:
        print("No data in 'jobs' table yet.")
except Exception as e:
    print(f"Error fetching schema: {e}")
