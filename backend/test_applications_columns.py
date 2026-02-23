import asyncio
from supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv(".env")

async def main():
    client = SupabaseService.get_client()
    res = client.table("applications").select("*").limit(1).execute()
    if res.data:
        print("Columns available:", list(res.data[0].keys()))

if __name__ == "__main__":
    asyncio.run(main())
