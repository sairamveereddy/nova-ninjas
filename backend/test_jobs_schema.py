import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")
client = SupabaseService.get_client()

try:
    res = client.table("jobs").select("*").limit(1).execute()
    if res.data:
        print("Jobs table columns:")
        print(res.data[0].keys())
    else:
        print("Jobs table works but is empty.")
except Exception as e:
    print(f"Error fetching jobs: {str(e)}")
