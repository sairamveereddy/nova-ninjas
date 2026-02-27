import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

async def get_columns():
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        return

    client = create_client(url, key)
    
    print("Listing columns for 'applications' table...")
    try:
        # Supabase doesn't allow direct query to information_schema via the normal client usually
        # But we can try an RPC if one exists, or just try to select * and see the keys of the first row
        res = client.table("applications").select("*").limit(1).execute()
        if res.data:
            print("Columns found in data:", list(res.data[0].keys()))
        else:
            print("No data in applications to infer columns.")
            
        # Try another table too
        res_jobs = client.table("jobs").select("*").limit(1).execute()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(get_columns())
