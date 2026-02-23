import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client
import sys

load_dotenv(".env")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "novaninjas")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

mongo_client = AsyncIOMotorClient(MONGO_URL, tlsAllowInvalidCertificates=True)
db = mongo_client[DB_NAME]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def migrate_bookings():
    print("Starting call_bookings migration...")
    cursor = db.call_bookings.find({})
    success = 0
    errors = 0
    async for doc in cursor:
        try:
            doc.pop('_id', None)
            
            # Map user ID if needed, but let's just insert
            # Supabase schema for call_bookings:
            # CREATE TABLE public.call_bookings (
            #   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            #   user_id UUID REFERENCES public.profiles(id),
            #   name TEXT, email TEXT, phone TEXT, experience TEXT,
            #   created_at TIMESTAMPTZ DEFAULT NOW(), status TEXT
            # );
            booking_doc = {
                "name": str(doc.get("name") or "Unknown") + (f" (Ph: {doc.get('phone')}, Exp: {doc.get('experience')})" if doc.get('phone') else ""),
                "email": doc.get("email"),
                "status": doc.get("status", "pending")
            }
            if "created_at" in doc:
                booking_doc["created_at"] = doc["created_at"]
                
             # Try mapping user_id by email
            if booking_doc.get("email"):
                prof = supabase.table("profiles").select("id").eq("email", booking_doc["email"]).execute()
                if prof.data:
                    booking_doc["user_id"] = prof.data[0]["id"]
                    
            supabase.table('call_bookings').insert(booking_doc).execute()
            success += 1
        except Exception as e:
            errors += 1
            print('Error:', e)
            
    print(f'Successfully migrated {success} call_bookings, {errors} errors.')
    mongo_client.close()

if __name__ == "__main__":
    asyncio.run(migrate_bookings())
