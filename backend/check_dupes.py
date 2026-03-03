import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(".env")

async def check_duplicate_users():
    email = "srkreddy452@gmail.com"
    client = SupabaseService.get_client()
    response = client.table("profiles").select("*").ilike("email", email).execute()
    print("SUPABASE PROFILES:")
    for doc in response.data:
        print(f"- ID: {doc.get('id')}, Role: {doc.get('role')}, Created: {doc.get('created_at')}")
        
    mongo_url = os.getenv("MONGO_URL")
    mongo = AsyncIOMotorClient(mongo_url)
    db = mongo[os.getenv("DB_NAME", "novaninjas")]
    print("\nMONGODB USERS:")
    cursor = db.users.find({"email": email})
    docs = await cursor.to_list(length=100)
    for doc in docs:
        print(f"- ID: {doc.get('_id')}, Role: {doc.get('role')}, Created: {doc.get('created_at')}")

if __name__ == "__main__":
    asyncio.run(check_duplicate_users())
