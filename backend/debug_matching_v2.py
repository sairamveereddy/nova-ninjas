
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

async def get_enriched_user(email, db):
    user = await db.users.find_one({"email": email})
    if not user: return None
    
    user_email = user.get("email")
    user_uid = user.get("id")
    user_oid = str(user.get("_id"))
    
    # Simulate extraction logic from updated server.py
    target_role = user.get("preferences", {}).get("target_role")
    
    if not target_role:
        search_query = {"$or": [{"userEmail": user_email}, {"userId": user_uid}, {"userId": user_oid}]}
        for coll in ["profiles", "saved_resumes", "resumes"]:
            res_cursor = db[coll].find(search_query).sort([("uploadedAt", -1), ("createdAt", -1)])
            async for res_doc in res_cursor:
                found_role = res_doc.get("jobTitle") or res_doc.get("target_role") or res_doc.get("role")
                found_text = res_doc.get("resumeText") or res_doc.get("textContent") or res_doc.get("text_content") or res_doc.get("text")
                if found_role and not target_role: target_role = found_role
                if found_text and not user.get("resume_text"): user["resume_text"] = found_text
                if target_role and user.get("resume_text"): break
            if target_role and user.get("resume_text"): break

    if "preferences" not in user: user["preferences"] = {}
    if target_role: user["preferences"]["target_role"] = target_role
    
    return user

def _calculate_match_score_DEBUG(job, user):
    print("\n--- DEBUG MATCH SCORE (Project Orion V2) ---")
    job_title = job.get("title", "").lower()
    job_desc = job.get("description", "").lower()
    job_text = f"{job_title} {job_desc}"
    
    user_text = (user.get("resume_text") or "").lower()
    user_title = (user.get("preferences", {}).get("target_role") or "").lower()
    
    print(f"User Enriched Role: '{user_title}'")
    print(f"Job Title: '{job_title}'")
    
    job_words = set(re.findall(r'\b\w{2,}\b', job_title))
    user_words = set(re.findall(r'\b\w{2,}\b', user_title))
    
    title_match = False
    if user_words and job_words:
        overlap = job_words.intersection(user_words)
        print(f"Title Overlap: {overlap}")
        if overlap:
            title_match = True
    
    keyword_score = 0
    if user_text:
        job_tokens = set(re.findall(r'\b\w{2,}\b', job_text))
        user_tokens = set(re.findall(r'\b\w{2,}\b', user_text))
        if job_tokens:
            common = job_tokens.intersection(user_tokens)
            denom = min(len(job_tokens), 40)
            overlap_ratio = len(common) / denom
            keyword_score = int(overlap_ratio * 100)
            print(f"Keywords: {len(common)}, Denom: {denom} -> {keyword_score}%")

    base_score = 12
    if title_match:
        final_score = 45 + min(int(keyword_score * 0.6), 54)
    else:
        final_score = base_score + min(keyword_score, 26)

    print(f"FINAL SCORE: {final_score}%")
    return final_score

async def debug_user_matching(email):
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    user = await get_enriched_user(email, db)
    if not user:
        print("USER NOT FOUND")
        return
        
    print(f"USER RECORD ENRICHED: {user.get('email')}")
    
    # Test Job: AI Engineer (manual search simulation)
    job_ai = {
        "title": "AI Engineer",
        "description": "Python developer building intelligent systems."
    }
    
    # Test Job: Completely mismatched
    job_unrelated = {
        "title": "Customer Service Representative",
        "description": "Handling calls and emails for retail brand."
    }
    
    _calculate_match_score_DEBUG(job_ai, user)
    _calculate_match_score_DEBUG(job_unrelated, user)

if __name__ == "__main__":
    asyncio.run(debug_user_matching("srkreddy452@gmail.com"))
