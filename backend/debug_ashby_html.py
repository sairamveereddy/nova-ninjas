import aiohttp
import asyncio
from bs4 import BeautifulSoup

async def debug_ashby_html():
    url = "https://jobs.ashbyhq.com/linear/82778dbf-711e-4d23-9d49-4a60db76737a"
    print(f"Fetching {url}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            html = await resp.text()
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # 1. Check meta description
            meta = soup.find("meta", {"name": "description"})
            print(f"Meta Desc: {meta['content'] if meta else 'Not found'}")
            
            # 2. Check for common description containers
            # Ashby often uses classes like `_jobDescription_...` or just plain semantic tags
            # Let's look for known identifying text "About the role" or similar
            
            # Print script tags to see if JSON is there
            scripts = soup.find_all("script", {"type": "application/json"})
            print(f"JSON Scripts: {len(scripts)}")
            
            # Try to find a large block of text
            print("\n--- Text Content Snippet ---")
            print(soup.get_text()[:500])
            
            # Look for specific class patterns if possible, or just dump the body classes
            body = soup.find("body")
            if body:
                print(f"\nBody classes: {body.get('class')}")

if __name__ == "__main__":
    asyncio.run(debug_ashby_html())
