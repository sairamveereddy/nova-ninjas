import asyncio
import json
from supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = SupabaseService.get_client()
    res = client.table("jobs").select("*").ilike("company", "%Ramp%").execute()
    with open("ramp_job.json", "w", encoding="utf-8") as f:
        json.dump(res.data, f, indent=2, default=str)
    print(f"Found {len(res.data)} Ramp jobs")

if __name__ == "__main__":
    asyncio.run(main())
