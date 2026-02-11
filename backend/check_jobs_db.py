
import asyncio
import os
from datetime import datetime, timedelta
import motor.motor_asyncio
from dotenv import load_dotenv

load_dotenv()

# Use the production DB URL if available, else local
# The user's env vars are likely loaded in the terminal context, but let's be safe
MONGO_URL = os.getenv("MONGO_URL")

async def check_jobs():
    if not MONGO_URL:
        print("ERROR: MONGO_URL not found in environment.")
        return

    print(f"Connecting to MongoDB...")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client.get_database() # default db
    
    # 1. Total Count
    total = await db.jobs.count_documents({})
    print(f"Total Jobs in DB: {total}")
    
    # 2. Recent Count (last 2 hours)
    cutoff = datetime.utcnow() - timedelta(hours=2)
    recent = await db.jobs.count_documents({"created_at": {"$gte": cutoff}})
    print(f"Jobs created in last 2 hours: {recent}")
    
    # 3. USA Filter Check
    # Check how many would pass the "US" filter
    us_jobs = await db.jobs.count_documents({"country": "us"})
    print(f"Jobs with country='us': {us_jobs}")
    
    # 4. Sample Job
    if total > 0:
        sample = await db.jobs.find_one({})
        print("\nSample Job Data:")
        print(f"Title: {sample.get('title')}")
        print(f"Company: {sample.get('company')}")
        print(f"Location: {sample.get('location')}")
        print(f"Country Tag: {sample.get('country')}")
        print(f"CreatedAt: {sample.get('created_at')}")
    else:
        print("\nNo jobs found. The sync might not have run yet.")

if __name__ == "__main__":
    asyncio.run(check_jobs())
