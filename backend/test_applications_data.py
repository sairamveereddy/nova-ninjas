import asyncio
from supabase_service import SupabaseService
from dotenv import load_dotenv
import json

load_dotenv(".env")

async def main():
    client = SupabaseService.get_client()
    # Fetch 5 sample applications to see what the user_id field looks like
    res = client.table("applications").select("id, user_id, metadata").limit(5).execute()
    for app in res.data:
        print(json.dumps(app, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
