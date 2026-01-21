import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import re

async def check_user(email_to_check):
    load_dotenv('.env')
    mongo_url = os.environ.get('MONGO_URL')
    
    if not mongo_url:
        print("MONGO_URL not found in .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    
    print("Listing all databases...")
    dbs = await client.list_database_names()
    print(f"Databases: {dbs}")
    
    email_found = False
    for db_name in dbs:
        if db_name in ['admin', 'local', 'config']:
            continue
            
        db = client[db_name]
        collections = await db.list_collection_names()
        if 'users' not in collections:
            continue
            
        print(f"Searching in database: {db_name}")
        cursor = db.users.find({"email": {"$regex": f"^{re.escape(email_to_check)}$", "$options": "i"}})
        users = await cursor.to_list(length=10)
        
        if users:
            email_found = True
            print(f"Found {len(users)} user(s) in {db_name}:")
            for u in users:
                print(f"  ---")
                print(f"  ID: {u.get('id')}")
                print(f"  Email: {u.get('email')}")
                print(f"  Is Verified: {u.get('is_verified')}")
                print(f"  Plan: {u.get('plan')}")
                print(f"  Created At: {u.get('created_at')}")
                print(f"  Verification Token: {'Exists' if u.get('verification_token') else 'None'}")
    
    if not email_found:
        print(f"User {email_to_check} not found in any database.")
    
    client.close()

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "srkreddy452@gmail.com"
    asyncio.run(check_user(email))
