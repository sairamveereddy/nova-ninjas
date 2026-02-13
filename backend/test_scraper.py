import asyncio
import logging
from scraper_service import fetch_url_content, extract_main_text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test():
    url = "https://remoteOK.com/remote-jobs/remote-senior-staff-platform-engineer-veeam-software-1130163"
    print(f"Testing scraper on {url}...")
    
    content, status = await fetch_url_content(url)
    print(f"Status: {status}")
    
    if content:
        print(f"Content length: {len(content)}")
        text = extract_main_text(content)
        print(f"Extracted text length: {len(text)}")
        print(f"Snippet: {text[:200]}...")
    else:
        print("Failed to fetch content.")

if __name__ == "__main__":
    asyncio.run(test())
