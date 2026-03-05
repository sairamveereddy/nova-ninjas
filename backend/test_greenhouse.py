import sys
import asyncio
from scrapling.spiders import Spider, Response
import json

class GreenhouseApiSpider(Spider):
    name = "greenhouse_api"
    # Testing with Anthropic's public API
    start_urls = ["https://boards-api.greenhouse.io/v1/boards/anthropic/jobs"]

    async def parse(self, response: Response):
        try:
            data = response.json()
            jobs = data.get("jobs", [])
            print(f"Found {len(jobs)} jobs via JSON API!")
            
            extracted = []
            for job in jobs:
                title = job.get("title", "")
                url = job.get("absolute_url", "")
                location = job.get("location", {}).get("name", "")
                
                job_data = {
                    "title": title,
                    "url": url,
                    "location": location,
                    "company": "Anthropic" # Hardcoded for this test
                }
                extracted.append(job_data)
                yield job_data
            
            if extracted:
                print("First 3 jobs:")
                print(json.dumps(extracted[:3], indent=2))
        except Exception as e:
            print(f"Error parsing JSON: {e}")

if __name__ == "__main__":
    GreenhouseApiSpider().start()
