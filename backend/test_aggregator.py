import asyncio
import logging
import os
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)

# Load env
load_dotenv()

# Import
from server import db # Reuse connection from server setup or create new
from job_apis.job_aggregator import JobAggregator

async def main():
    print("Initializing Aggregator...")
    # Create simple mongo connection if db is None (from server import often fails if app not running)
    from pymongo import MongoClient
    import motor.motor_asyncio
    
    MONGO_URL = os.getenv("MONGO_URL")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client["nova-ninjas"]
    
    aggregator = JobAggregator(db)
    
    print("Running aggregation (Production Config)...")
    # Match job_fetcher.py config
    stats = await aggregator.aggregate_all_jobs(
        use_adzuna=False,
        use_jsearch=False, 
        use_usajobs=True, 
        use_rss=True
    )
    
    print("Aggregation done. Checking stats...")
    
    import json
    with open("aggregator_stats.txt", "w") as f:
        # Convert errors list to string to be safe
        stats["errors"] = [str(e) for e in stats["errors"]]
        json.dump(stats, f, indent=2, default=str)
    
    print("Stats written to aggregator_stats.txt")

if __name__ == "__main__":
    asyncio.run(main())
