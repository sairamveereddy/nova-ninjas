
import asyncio
import logging
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_test():
    try:
        print("Importing scrape_job_description...")
        from scraper_service import scrape_job_description
        print("Import successful.")
        
        url = "https://www.google.com/about/careers/applications/jobs/results/134444053648679622"
        print(f"Testing scrape_job_description with URL: {url}")
        result = await scrape_job_description(url)
        print("Result:", result)
        
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
