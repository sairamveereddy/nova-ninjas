import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
import json

async def check_metadata():
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        return

    client = create_client(url, key)
    
    print("Checking applications metadata...")
    try:
        res = client.table("applications").select("id, user_id, metadata").not_.is_("metadata", "null").limit(10).execute()
        if res.data:
            print(f"Found {len(res.data)} rows with metadata.")
            for row in res.data:
                print(f"ID: {row['id']} | UserID: {row['user_id']}")
                print(f"Metadata: {json.dumps(row['metadata'], indent=2)}")
                print("-" * 20)
        else:
            print("No rows with metadata found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_metadata())
