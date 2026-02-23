import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

async def main():
    job_id = "00f63426-318d-46c6-b78d-b9fda445eaf0"
    url = f"http://localhost:8001/api/jobs/{job_id}/enrich"
    async with httpx.AsyncClient() as client:
        res = await client.post(url)
        print("Status", res.status_code)
        print("Response JSON:")
        print(res.json())

if __name__ == "__main__":
    asyncio.run(main())
