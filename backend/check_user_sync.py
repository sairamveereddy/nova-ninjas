import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from supabase_service import SupabaseService

async def check_user():
    load_dotenv('.env')
    
    # Check MongoDB
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    email = 'srkreddy452@gmail.com'
    
    mongo_user = await db.users.find_one({'email': email})
    print(f"--- MongoDB Check for {email} ---")
    if mongo_user:
        print(f"FOUND: ID={mongo_user.get('_id')}, Role={mongo_user.get('role')}, Verified={mongo_user.get('is_verified')}")
    else:
        print("NOT FOUND in MongoDB")
        
    # Check Supabase
    print(f"\n--- Supabase Check for {email} ---")
    supabase_user = SupabaseService.get_user_by_email(email)
    if supabase_user:
        print(f"FOUND: ID={supabase_user.get('id')}, Role={supabase_user.get('role')}")
    else:
        print("NOT FOUND in Supabase")

if __name__ == "__main__":
    asyncio.run(check_user())
