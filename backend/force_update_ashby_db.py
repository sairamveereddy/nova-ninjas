import asyncio
import aiohttp
import logging
import re
import json
from bs4 import BeautifulSoup
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AshbyUpdater")

async def update_all_ashby():
    # Get all Ashby jobs with simple description
    # process only those with "Apply at" in fullDescription or short description
    cursor = db.jobs.find({"source": "ashby"})
    jobs_to_update = []
    
    for job in cursor:
        desc = job.get("fullDescription", "")
        if "Apply at" in desc[:20] or len(desc) < 200:
            jobs_to_update.append(job)
            
    print(f"Found {len(jobs_to_update)} Ashby jobs to update.")
    
    sem = asyncio.Semaphore(15) # Faster concurrency
    
    async def process_job(job):
        url = job.get("sourceUrl")
        job_id = job.get("_id")
        
        if not url or "ashbyhq.com" not in url:
            return
            
        async with sem:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=15) as resp:
                        if resp.status == 200:
                            html = await resp.text()
                            
                            pattern = re.compile(r'window\.__appData\s*=\s*({.+?});', re.DOTALL)
                            match = pattern.search(html)
                            
                            new_desc = None
                            if match:
                                try:
                                    data = json.loads(match.group(1))
                                    # Recursive find
                                    def find_key(obj, key):
                                        if isinstance(obj, dict):
                                            if key in obj: return obj[key]
                                            for k, v in obj.items():
                                                res = find_key(v, key)
                                                if res: return res
                                        elif isinstance(obj, list):
                                            for item in obj:
                                                res = find_key(item, key)
                                                if res: return res
                                        return None

                                    html_desc = find_key(data, "descriptionHtml")
                                    if html_desc:
                                        new_desc = html_desc
                                    else:
                                        plain_desc = find_key(data, "description")
                                        if plain_desc:
                                            new_desc = plain_desc
                                except:
                                    pass
                            
                            if new_desc:
                                # Update DB
                                db.jobs.update_one(
                                    {"_id": job_id},
                                    {"$set": {"fullDescription": new_desc, "description": new_desc[:500]}}
                                )
                                print(f"Updated {job.get('title')}")
                            else:
                                print(f"No desc found for {job.get('title')}")
                        else:
                            print(f"HTTP {resp.status} for {url}")
            except Exception as e:
                print(f"Error {job.get('title')}: {e}")

    tasks = [process_job(job) for job in jobs_to_update]
    await asyncio.gather(*tasks)
    print("Update Complete.")

if __name__ == "__main__":
    asyncio.run(update_all_ashby())
