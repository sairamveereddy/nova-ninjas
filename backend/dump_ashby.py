import aiohttp
import asyncio

async def dump_ashby_html():
    url = "https://jobs.ashbyhq.com/linear/82778dbf-711e-4d23-9d49-4a60db76737a"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as resp:
            html = await resp.text()
            with open("ashby_dump.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("Dumped to ashby_dump.html")

if __name__ == "__main__":
    asyncio.run(dump_ashby_html())
