
import asyncio
import aiohttp
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# headers for Workday to mimic Chrome
# Note: These need to be very specific to bypass Akamai
WORKDAY_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Origin": "https://nvidia.wd1.myworkdayjobs.com",
    "Referer": "https://nvidia.wd1.myworkdayjobs.com/NVIDIAExternalCareerSite",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Connection": "keep-alive"
}

async def fetch_ashby_graphql(company_id: str):
    print(f"\n--- Fetching Ashby (GraphQL): {company_id} ---")
    url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    
    payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": {
            "organizationHostedJobsPageName": company_id
        },
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
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=WORKDAY_HEADERS) as response:
                print(f"Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    # DEBUG: Print exact keys
                    print(f"Keys: {data.keys()}")
                    if "errors" in data:
                        print(f"GraphQL Errors: {data['errors']}")
                    
                    job_board = data.get("data", {}).get("jobBoard")
                    print(f"JobBoard data found: {job_board is not None}")
                    
                    if job_board:
                        jobs = job_board.get("jobPostings", [])
                        print(f"SUCCESS! Found {len(jobs)} jobs")
                        if jobs:
                            print(f"Sample: {jobs[0].get('title')}")
                        return jobs
                    else:
                        print("No jobBoard data in response")
                else:
                    print(f"Error: {await response.text()}")
    except Exception as e:
        print(f"Exception: {e}")
    return []

async def fetch_workday_advanced(tenant: str, site: str):
    print(f"\n--- Fetching Workday (Advanced): {tenant} ---")
    base_url = f"https://{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs"
    
    # Custom headers for this specific tenant
    headers = WORKDAY_HEADERS.copy()
    headers["Origin"] = f"https://{tenant}.wd1.myworkdayjobs.com"
    headers["Referer"] = f"https://{tenant}.wd1.myworkdayjobs.com/{site}"

    payload = {"limit": 20, "offset": 0, "searchText": ""}

    try:
        async with aiohttp.ClientSession() as session:
            # 1. First visit main page to get cookies (optional but helpful)
            async with session.get(headers["Referer"], headers=headers) as visit_resp:
                print(f"Visit Page Status: {visit_resp.status}")
            
            # 2. Now hit API
            async with session.post(base_url, json=payload, headers=headers) as response:
                print(f"API Reuse Status: {response.status}")
                if response.status == 200:
                    data = await response.json()
                    print(f"SUCCESS! Total: {data.get('total')}")
                    return data.get("jobPostings", [])
                else:
                    print(f"Error: {response.status}")
    except Exception as e:
        print(f"Exception: {e}")
    return []

async def main():
    # 1. Test Advanced Ashby
    await fetch_ashby_graphql("linear")
    await fetch_ashby_graphql("notion")
    await fetch_ashby_graphql("vercel")
    
    # 2. Test Advanced Workday
    # await fetch_workday_advanced("nvidia", "NVIDIAExternalCareerSite")

if __name__ == "__main__":
    asyncio.run(main())
