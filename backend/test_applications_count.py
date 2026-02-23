import asyncio
from supabase_service import SupabaseService
from dotenv import load_dotenv

load_dotenv(".env")

async def main():
    client = SupabaseService.get_client()
    user = SupabaseService.get_user_by_email("srkreddy452@gmail.com")
    print("User ID:", user["id"] if user else "Not found")
    
    if user:
        res3 = client.table("applications").select("*").eq("user_id", user["id"]).execute()
        print("Applications for user_id mapping:", len(res3.data))

if __name__ == "__main__":
    asyncio.run(main())
