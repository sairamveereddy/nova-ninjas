import asyncio
import aiohttp
import logging
from datetime import datetime, timezone
import re
import json
from bs4 import BeautifulSoup
from typing import List, Dict, Any

# Mock helpers
def parse_job_sections(desc): return {"responsibilities": "", "qualifications": "", "benefits": ""}
def detect_visa_sponsorship(desc): return False
def detect_work_type(title, loc): return "onsite"
def sanitize_description(desc): return desc
def build_job_tags(data): return []

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fetch_ashby_jobs(company_id: str) -> List[Dict[str, Any]]:
    print(f"Fetching {company_id}...")
    gql_url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    
    # 1. Fetch List
    jobs_list = []
    try:
        payload = {
            "operationName": "ApiJobBoardWithTeams",
            "variables": { "organizationHostedJobsPageName": company_id },
            "query": """
            query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
              jobBoard: jobBoardWithTeams(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
              ) {
                jobPostings {
                  id
                  title
                  locationName
                  employmentType
                  secondaryLocations {
                    locationName
                  }
                  compensationTierSummary
                }
              }
            }
            """
        }
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(gql_url, json=payload, headers=headers) as response:
                if response.status != 200:
                    print(f"Ashby GraphQL failed: {response.status}")
                    return []
                data = await response.json()
                job_board = data.get("data", {}).get("jobBoard")
                if not job_board: return []
                jobs_list = job_board.get("jobPostings", [])
                print(f"Found {len(jobs_list)} jobs in list.")
                
    except Exception as e:
        print(f"Error fetching list: {e}")
        return []

    # 2. Fetch Details
    if not jobs_list: return []

    sem = asyncio.Semaphore(5)
    
    async def fetch_detail(job_summary):
        job_id = job_summary.get("id")
        title = job_summary.get("title")
        job_url = f"https://jobs.ashbyhq.com/{company_id}/{job_id}"
        
        full_desc = "See full job post"
        desc_text = title
        
        async with sem:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(job_url, headers={"User-Agent": headers["User-Agent"]}, timeout=20) as resp:
                        if resp.status == 200:
                            html = await resp.text()
                            
                            # Regex Match
                            pattern = re.compile(r'window\.__appData\s*=\s*({.+?});', re.DOTALL)
                            match = pattern.search(html)
                            if match:
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
                                    full_desc = html_desc
                                    desc_text = "HTML FOUND"
                                else:
                                    desc_text = "HTML NOT FOUND IN JSON"
                            else:
                                desc_text = "REGEX NO MATCH"
                        else:
                            desc_text = f"HTTP {resp.status}"
            except Exception as e:
                desc_text = f"EXCEPTION: {e}"
        
        print(f"Job {job_id}: {desc_text}")
        
        # We return the object regardless of fail, to see partials
        return {
            "title": title,
            "fullDescription": full_desc,
            "debug_status": desc_text
        }

    tasks = [fetch_detail(job) for job in jobs_list[:2]] # Test only 2
    results = await asyncio.gather(*tasks)
    return results

if __name__ == "__main__":
    res = asyncio.run(fetch_ashby_jobs("linear"))
    print("\nResults:")
    for r in res:
        print(r)
