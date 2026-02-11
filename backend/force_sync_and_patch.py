
import asyncio
import os
import logging
from datetime import datetime
import motor.motor_asyncio
from dotenv import load_dotenv

# Setup basic logging to see what's happening
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL")

# Mock the specific service import or just copy the class logic if import is complex?
# importing from local file is better if possible.
try:
    from job_sync_service import JobSyncService
    print("Successfully imported JobSyncService")
except ImportError:
    print("Could not import JobSyncService, will assume local path issue and try direct execution")
    # If import fails (due to path), we might need to adjust sys.path or just run a simplified version.
    # For now, let's try assuming we run this from backend/ dir where the file is.

async def fix_and_sync():
    if not MONGO_URL:
        logger.error("MONGO_URL not found")
        return

    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
    db = client.get_database()
    
    # 1. Patch Existing Jobs
    logger.info("Patching existing jobs with country='us'...")
    result = await db.jobs.update_many(
        {"country": {"$exists": False}},
        {"$set": {"country": "us"}}
    )
    logger.info(f"Patched {result.modified_count} jobs.")
    
    # 2. Force Sync
    try:
        service = JobSyncService(db)
        logger.info("Starting Adzuna Sync...")
        count = await service.sync_adzuna_jobs()
        logger.info(f"Adzuna Sync Complete. Added {count} jobs.")
        
        # Try JSearch too (RapidAPI)
        if os.getenv("RAPIDAPI_KEY"):
             logger.info("Starting JSearch Sync...")
             j_count = await service.sync_jsearch_jobs()
             logger.info(f"JSearch Sync Complete. Added {j_count} jobs.")
        else:
             logger.warning("RAPIDAPI_KEY not found, skipping JSearch.")
             
    except Exception as e:
        logger.error(f"Sync failed: {e}")

if __name__ == "__main__":
    asyncio.run(fix_and_sync())
