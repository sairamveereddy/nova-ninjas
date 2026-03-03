import asyncio
import os
from dotenv import load_dotenv
from document_generator import generate_expert_documents

load_dotenv(".env")

resume = """
SAIRAM KUMAR
Location: New York, NY | Email: sairam@example.com
PROFESSIONAL EXPERIENCE
Software Engineer | Tech Corp | Jan 2020 - Present
- Built scalable backends in Python and FastAPI.
- Improved database query performance by 40%.
"""

jd = """
Senior Python Developer
We are looking for a Senior Developer with 5+ years of experience.
Must know Python, FastAPI, and Postgres.
"""

async def test():
    print("Testing generate_expert_documents...")
    res = await generate_expert_documents(resume, jd)
    print("KEYS:", res.keys())
    print("\nCOVER LETTER:\n", res.get("cover_letter"))

asyncio.run(test())
