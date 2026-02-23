import asyncio
import logging
from supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv(".env")
logging.basicConfig(level=logging.INFO)

async def main():
    stats = SupabaseService.get_admin_stats()
    print("STATS:", stats)

if __name__ == "__main__":
    asyncio.run(main())
