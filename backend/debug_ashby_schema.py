import aiohttp
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_ashby_schema():
    url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams"
    company_id = "linear" # Known working company
    
    # Try requesting descriptionHtml
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
              descriptionHtml
              description
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

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                print(f"Status: {response.status}")
                data = await response.json()
                
                # Check for errors
                if "errors" in data:
                    print("GraphQL Errors:", data["errors"])
                else:
                    jobs = data.get("data", {}).get("jobBoard", {}).get("jobPostings", [])
                    if jobs:
                        print(f"Success! Got {len(jobs)} jobs.")
                        print("Sample Job Keys:", jobs[0].keys())
                        print("Desc HTML length:", len(jobs[0].get("descriptionHtml", "") or ""))
                    else:
                        print("No jobs found or structure changed.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ashby_schema())
