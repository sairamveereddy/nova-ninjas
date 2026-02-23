import aiohttp
import asyncio
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)

async def test_ashby_detail():
    url = "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting"
    # Need a valid ID. I'll pick one from previous output or just guess if I had one. 
    # I'll use a known ID from Linear if possible, or fetch references first.
    
    # First get a valid ID
    list_payload = {
        "operationName": "ApiJobBoardWithTeams",
        "variables": { "organizationHostedJobsPageName": "linear" },
        "query": """
        query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
          jobBoard: jobBoardWithTeams(
            organizationHostedJobsPageName: $organizationHostedJobsPageName
          ) {
            jobPostings {
              id
            }
          }
        }
        """
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json"
    }

    async with aiohttp.ClientSession() as session:
        # Get ID
        async with session.post(url, json=list_payload, headers=headers) as resp:
            data = await resp.json()
            jobs = data.get("data", {}).get("jobBoard", {}).get("jobPostings", [])
            if not jobs:
                print("No jobs found to test.")
                return
            job_id = jobs[0]["id"]
            print(f"Testing with Job ID: {job_id}")

        # Now try detail query
        detail_payload = {
            "operationName": "ApiJobPosting",
            "variables": { "organizationHostedJobsPageName": "linear", "jobPostingId": job_id },
            "query": """
            query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) {
              jobPosting(
                organizationHostedJobsPageName: $organizationHostedJobsPageName
                jobPostingId: $jobPostingId
              ) {
                descriptionHtml
                description
              }
            }
            """
        }
        
        async with session.post(url, json=detail_payload, headers=headers) as resp:
            print(f"Detail Status: {resp.status}")
            data = await resp.json()
            print("Detail Response:", str(data)[:500])

if __name__ == "__main__":
    asyncio.run(test_ashby_detail())
