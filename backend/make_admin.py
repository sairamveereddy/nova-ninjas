import asyncio
from dotenv import load_dotenv
load_dotenv('.env')
from supabase_service import SupabaseService
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def make_admin():
    email = "srkreddy452@gmail.com"
    # Update Supabase
    client = SupabaseService.get_client()
    try:
        res = client.table("profiles").update({"role": "admin"}).eq("email", email).execute()
        print(f"Supabase update: {res.data}")
    except Exception as e:
        print(f"Supabase update error: {e}")
    
    # Update MongoDB
    try:
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME", "novaninjas")
        m_client = AsyncIOMotorClient(mongo_url, tlsAllowInvalidCertificates=True)
        db = m_client[db_name]
        
        result = await db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
        print(f"MongoDB update: modified {result.modified_count} documents")
    except Exception as e:
        print(f"MongoDB update error: {e}")

asyncio.run(make_admin())
