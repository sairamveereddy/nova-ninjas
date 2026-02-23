
import sys
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

# Add parent dir to sys.path to import from server
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import _extract_target_role

load_dotenv()

async def verify_extraction():
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    email = "srkreddy452@gmail.com"
    print(f"--- VERIFYING EXTRACTION FOR {email} ---")
    
    user = await db.users.find_one({"email": email})
    if not user:
        print("User not found")
        return

    # Check multiple resume sources
    resume_text = ""
    saved_resume = await db.saved_resumes.find_one({"userEmail": email}, sort=[("uploadedAt", -1)])
    if saved_resume and saved_resume.get("textContent"):
        resume_text = saved_resume["textContent"]
        print(f"Using saved resume text: {saved_resume.get('fileName')}")
    else:
        # Fallback to resumes collection
        uid = user.get("id") or str(user.get("_id"))
        others = await db.resumes.find({"$or": [{"userEmail": email}, {"userId": uid}]}).sort("createdAt", -1).to_list(length=1)
        if others:
             resume_text = others[0].get("text_content") or others[0].get("textContent") or ""
             print(f"Using resumes collection text: {others[0].get('fileName') or others[0].get('_id')}")
    
    role = _extract_target_role(resume_text)
    print(f"EXTRACTED ROLE: '{role}'")
    
    if "AI" in role or "Developer" in role:
        print("SUCCESS: Role correctly extracted.")
    else:
        print("WARNING: Extraction might be weak. Check heuristics.")

if __name__ == "__main__":
    asyncio.run(verify_extraction())
