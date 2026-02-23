import asyncio
from supabase_service import SupabaseService
from dotenv import load_dotenv
import json

load_dotenv()

async def main():
    client = SupabaseService.get_client()
    if not client:
        print("No supabase client")
        return
        
    res = client.table("jobs").select("*").ilike("company", "%Influur%").execute()
    
    with open("job_out.json", "w", encoding="utf-8") as f:
        json.dump(res.data, f, indent=2, default=str)
    print("Done")

if __name__ == "__main__":
    asyncio.run(main())
