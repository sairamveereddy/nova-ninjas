import asyncio
import aiohttp
import json

BASE_URL = "http://localhost:8000/api"

async def test_endpoint(name, path, payload):
    print(f"Testing {name} ({path})...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE_URL}{path}", json=payload) as response:
                status = response.status
                data = await response.json()
                if status == 200:
                    print(f"✅ {name} Success (200)")
                    print(f"   Response snippet: {str(data)[:200]}...")
                else:
                    print(f"❌ {name} Failed ({status})")
                    print(f"   Error: {data}")
    except Exception as e:
        print(f"❌ {name} Exception: {e}")

async def run_tests():
    tests = [
        {
            "name": "Salary Negotiation",
            "path": "/ai/salary-negotiation",
            "payload": {
                "currentOffer": "100000",
                "marketRate": "120000",
                "role": "Software Engineer",
                "yearsExperience": "5",
                "uniqueValue": "Cloud expertise"
            }
        },
        {
            "name": "LinkedIn Headline",
            "path": "/ai/linkedin-headline",
            "payload": {
                "current_headline": "Software Developer",
                "target_role": "Senior Software Engineer"
            }
        },
        {
            "name": "Career Gap",
            "path": "/ai/career-gap",
            "payload": {
                "gapDuration": "6 months",
                "reason": "Traveling",
                "activities": "Learning AWS"
            }
        },
        {
            "name": "Job Decoder",
            "path": "/ai/job-decoder",
            "payload": {
                "job_description": "We are looking for a rockstar developer who can work in a fast-paced environment and wear many hats."
            }
        }
    ]

    for test in tests:
        await test_endpoint(test["name"], test["path"], test["payload"])
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(run_tests())
