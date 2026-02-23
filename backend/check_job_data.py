import motor.motor_asyncio
import asyncio
import os
from bson import ObjectId
from dotenv import load_dotenv

async def run():
    load_dotenv()
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    print(f"Connecting to {db_name}...")
    client = motor.motor_asyncio.AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Searching for a non-Adzuna job...")
    job = await db.jobs.find_one({'source': {'$ne': 'adzuna'}})
    
    if job:
        print("Job found!")
        for key, value in job.items():
            if key in ['title', 'company', 'sourceUrl', 'url', 'redirect_url', 'externalId', 'source']:
                print(f"{key}: {value}")
            elif key == '_id':
                print(f"{key}: {value}")
    else:
        print("Job not found. Fetching 3 recent jobs instead...")
        cursor = db.jobs.find().sort('createdAt', -1).limit(3)
        async for j in cursor:
            print("\n--- Next Job ---")
            for key, value in j.items():
                if key in ['title', 'company', 'sourceUrl', 'url', 'redirect_url', 'externalId']:
                    print(f"{key}: {value}")
                elif key == '_id':
                    print(f"{key}: {value}")

if __name__ == "__main__":
    asyncio.run(run())
