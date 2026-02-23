import asyncio
from supabase_service import SupabaseService
from dotenv import load_dotenv
from collections import Counter

load_dotenv(".env")

async def main():
    client = SupabaseService.get_client()
    res = client.table("applications").select("user_id").execute()
    counts = Counter([app["user_id"] for app in res.data])
    print("Unique user_ids with applications:", counts.most_common())
    
    # Let's check the user_id of srkreddy452@gmail.com again
    user = SupabaseService.get_user_by_email("srkreddy452@gmail.com")
    print("srkreddy452@gmail.com user_id:", user["id"] if user else "Not found")

if __name__ == "__main__":
    asyncio.run(main())
