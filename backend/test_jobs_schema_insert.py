import asyncio
import os
import uuid
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")
client = SupabaseService.get_client()

try:
    job_data = {
        "title": "Test Retry",
        "company": "Test Company",
        "job_id": f"test-{uuid.uuid4()}",
        "description": "desc",
        "location": "loc",
        "url": "https://example.com"
    }
    res = client.table("jobs").insert(job_data).execute()
    print("Jobs insert successful!")
except Exception as e:
    print(f"Error inserting job: {str(e)}")
