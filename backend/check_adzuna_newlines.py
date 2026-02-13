import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:eEacDeC2Ge1442f4D3A134262FfA635B@roundhouse.proxy.rlwy.net:47714")
DB_NAME = "test"

async def check_adzuna():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("Checking for Adzuna job...")
    job = await db.jobs.find_one({"source": "adzuna"})
    
    if job:
        desc = job.get("description", "")
        print(f"Found Adzuna job: {job.get('company')} - {job.get('title')}")
        print(f"Description length: {len(desc)}")
        print(f"Has newlines? {'\\n' in desc}")
        print(f"Snippet: {repr(desc[:200])}")
    else:
        print("No Adzuna job found.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check_adzuna())
