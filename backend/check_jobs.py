
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    url = os.getenv("MONGO_URL")
    print(f"Connecting to {url}...")
    client = AsyncIOMotorClient(url)
    db = client[os.getenv("DB_NAME")]
    
    count = await db.jobs.count_documents({})
    print(f"Total Jobs: {count}")
    
    distinct_sources = await db.jobs.distinct("source")
    print(f"Sources found: {distinct_sources}")
    
    # Check Workday specifically
    wd_count = await db.jobs.count_documents({"source": "workday"})
    print(f"Workday Jobs: {wd_count}")
    
    # Check JSearch
    js_count = await db.jobs.count_documents({"source": "jsearch"})
    print(f"JSearch Jobs: {js_count}")

    # Check Recent (72h)
    from datetime import datetime, timedelta
    recent = await db.jobs.count_documents({"created_at": {"$gte": datetime.utcnow() - timedelta(hours=72)}})
    print(f"Jobs in last 72h: {recent}")

if __name__ == "__main__":
    asyncio.run(check())
