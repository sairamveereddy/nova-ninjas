import asyncio
import json
from supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv(".env")

async def main():
    client = SupabaseService.get_client()
    res = client.table("applications").select("*").limit(3).execute()
    print("Sample of the 485 applications:")
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
