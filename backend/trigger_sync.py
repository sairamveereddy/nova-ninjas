import asyncio
import logging
from dotenv import load_dotenv
from job_fetcher import scheduled_job_fetch
from supabase_service import SupabaseService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("trigger_sync")

async def main():
    load_dotenv()
    logger.info("Starting manual job sync to Supabase...")
    
    # Initialize Supabase
    client = SupabaseService.get_client()
    if not client:
        logger.error("Failed to initialize Supabase client. Check environment variables.")
        return

    # Run the scheduled fetch logic which now uses Supabase
    try:
        # We can pass a dummy db if needed, but we refactored it to be optional
        await scheduled_job_fetch()
        logger.info("Manual job sync completed successfully!")
        
        # Verify count
        count = SupabaseService.get_jobs_count(fresh_only=False)
        logger.info(f"Verified: There are now {count} jobs in Supabase.")
        
    except Exception as e:
        logger.error(f"Sync failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
