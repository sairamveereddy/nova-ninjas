import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(".env")

async def update_mongo_role():
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    email = "srkreddy452@gmail.com"
    
    user = await db.users.find_one({"email": email})
    if user:
        print(f"User found in Mongo. Current role: {user.get('role')}")
        result = await db.users.update_one(
            {"email": email},
            {"$set": {"role": "admin"}}
        )
        print(f"Modified count: {result.modified_count}")
        
        updated = await db.users.find_one({"email": email})
        print(f"New role in Mongo: {updated.get('role')}")
    else:
        print("User not found in MongoDB.")

if __name__ == "__main__":
    asyncio.run(update_mongo_role())
