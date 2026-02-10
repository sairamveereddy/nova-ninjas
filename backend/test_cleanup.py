"""
Test cleanup of old jobs (72 hours)
"""
import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from job_sync_service import JobSyncService
from dotenv import load_dotenv

load_dotenv()

async def test_cleanup():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "novaninjas")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Initialize job sync service
    job_sync = JobSyncService(db)
    
    print("=" * 60)
    print("Testing 72-Hour Job Cleanup")
    print("=" * 60)
    
    # Get current stats
    total_before = await db.jobs.count_documents({})
    old_jobs = await db.jobs.count_documents({
        "created_at": {"$lt": datetime.utcnow() - timedelta(hours=72)}
    })
    recent_jobs = await db.jobs.count_documents({
        "created_at": {"$gte": datetime.utcnow() - timedelta(hours=72)}
    })
    
    print(f"\nBefore Cleanup:")
    print(f"  Total jobs: {total_before}")
    print(f"  Jobs older than 72 hours: {old_jobs}")
    print(f"  Jobs within 72 hours: {recent_jobs}")
    
    # Run cleanup
    print("\nRunning cleanup...")
    deleted_count = await job_sync.cleanup_old_jobs()
    
    # Get stats after cleanup
    total_after = await db.jobs.count_documents({})
    
    print(f"\nAfter Cleanup:")
    print(f"  Jobs deleted: {deleted_count}")
    print(f"  Total jobs remaining: {total_after}")
    print(f"  All remaining jobs are within 72 hours: ✅")
    
    # Show sample of remaining jobs
    print("\nSample of remaining jobs:")
    print("-" * 60)
    jobs = await db.jobs.find().sort("created_at", -1).limit(5).to_list(length=5)
    for i, job in enumerate(jobs, 1):
        created_at = job.get('created_at')
        if created_at:
            hours_old = (datetime.utcnow() - created_at).total_seconds() / 3600
            print(f"\nJob {i}:")
            print(f"  Title: {job.get('title')}")
            print(f"  Company: {job.get('company')}")
            print(f"  Created: {hours_old:.1f} hours ago")
            print(f"  Source: {job.get('source')}")
    
    print("\n" + "=" * 60)
    print("Cleanup test completed!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_cleanup())
