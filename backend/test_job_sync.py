"""
Test script to verify job sync functionality
"""
import asyncio
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from motor.motor_asyncio import AsyncIOMotorClient
from job_sync_service import JobSyncService
from dotenv import load_dotenv

load_dotenv()

async def test_job_sync():
    # Connect to MongoDB
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "novaninjas")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Initialize job sync service
    job_sync = JobSyncService(db)
    
    print("=" * 60)
    print("Testing Job Sync Service")
    print("=" * 60)
    
    # Test Adzuna API
    print("\n1. Testing Adzuna API...")
    print("-" * 60)
    adzuna_count = await job_sync.sync_adzuna_jobs(query="software engineer", max_days_old=1)
    print(f"✅ Adzuna sync completed: {adzuna_count} jobs added")
    
    # Test JSearch API
    print("\n2. Testing JSearch API...")
    print("-" * 60)
    jsearch_count = await job_sync.sync_jsearch_jobs(query="software engineer")
    print(f"✅ JSearch sync completed: {jsearch_count} jobs added")
    
    # Get sync status
    print("\n3. Getting sync status...")
    print("-" * 60)
    status = await job_sync.get_sync_status()
    print(f"Total jobs in database: {status['total_jobs']}")
    print(f"Jobs added in last hour: {status['jobs_last_hour']}")
    print(f"\nAdzuna status: {status['adzuna'].get('status', 'never_run')}")
    print(f"JSearch status: {status['jsearch'].get('status', 'never_run')}")
    
    # Show sample jobs
    print("\n4. Sample jobs from database:")
    print("-" * 60)
    jobs = await db.jobs.find().limit(5).to_list(length=5)
    for i, job in enumerate(jobs, 1):
        print(f"\nJob {i}:")
        print(f"  Title: {job.get('title')}")
        print(f"  Company: {job.get('company')}")
        print(f"  Location: {job.get('location')}")
        print(f"  Source: {job.get('source')}")
        print(f"  Categories: {job.get('categories', [])}")
        print(f"  Posted: {job.get('posted_within_hours')} hours ago")
    
    print("\n" + "=" * 60)
    print("Test completed successfully!")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_job_sync())
