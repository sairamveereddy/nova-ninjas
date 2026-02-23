
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
    
    target_role = user.get("preferences", {}).get("target_role")
    
    # Comprehensive check logic from server.py (updated version)
    if not target_role:
        search_query = {"$or": [{"userEmail": user_email}, {"userId": user_uid}, {"userId": user_oid}]}
        
        # saved_resumes
        res_cursor = db.saved_resumes.find(search_query).sort([("uploadedAt", -1), ("createdAt", -1)])
        async for res_doc in res_cursor:
            found_role = res_doc.get("jobTitle") or res_doc.get("target_role") or res_doc.get("role")
            found_text = res_doc.get("resumeText") or res_doc.get("textContent") or res_doc.get("text_content") or res_doc.get("text")
            
            if found_role and not target_role:
                target_role = found_role
            if found_text and not user.get("resume_text"):
                user["resume_text"] = found_text
            
            if target_role and user.get("resume_text"):
                break
        
        # Fallback to resumes if still missing
        if not target_role or not user.get("resume_text"):
            res_cursor2 = db.resumes.find(search_query).sort([("createdAt", -1)])
            async for res_doc in res_cursor2:
                found_role = res_doc.get("jobTitle") or res_doc.get("target_role") or res_doc.get("role")
                found_text = res_doc.get("resumeText") or res_doc.get("textContent") or res_doc.get("text_content") or res_doc.get("text")
                if not target_role and found_role: target_role = found_role
                if not user.get("resume_text") and found_text: user["resume_text"] = found_text
                if target_role and user.get("resume_text"): break

    if "preferences" not in user: user["preferences"] = {}
    if target_role: 
        user["preferences"]["target_role"] = target_role
    
    return user

def _calculate_match_score_DEBUG(job, user):
    print("\n--- DEBUG MATCH SCORE (MATCHING SERVER LOGIC) ---")
    job_title = job.get("title", "").lower()
    job_desc = job.get("description", "").lower()
    job_text = f"{job_title} {job_desc}"
    
    user_text = (user.get("resume_text") or "").lower()
    user_title = (user.get("preferences", {}).get("target_role") or "").lower()
    
    print(f"Enriched Target Role: '{user_title}'")
    print(f"Enriched Resume Length: {len(user_text)}")
    print(f"Job Title: '{job_title}'")
    
    # 2-char token logic
    job_words = set(re.findall(r'\b\w{2,}\b', job_title))
    user_words = set(re.findall(r'\b\w{2,}\b', user_title))
    
    print(f"Job Words (min2): {job_words}")
    print(f"User Words (min2): {user_words}")
    
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
            # Use sensitive denominator
            denom = min(len(job_tokens), 50)
            overlap_ratio = len(common) / denom
            keyword_score = int(overlap_ratio * 100)
            print(f"Keywords Common: {len(common)}, Denom: {denom}")
            print(f"Keyword Score: {keyword_score}%")

    if title_match:
        final_score = 45 + min(int(keyword_score * 0.54), 54)
        print(f"FINAL SCORE: {final_score}% (TITLE MATCH)")
    else:
        final_score = min(keyword_score, 35)
        print(f"FINAL SCORE: {final_score}% (MISMATCH)")

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
    
    # Test Job 1: AI Job (high match expected)
    job_ai = {
        "title": "Senior AI Engineer",
        "description": "Python, LLMs, AI agents, deep learning, PyTorch, engineering solutions..."
    }
    
    _calculate_match_score_DEBUG(job_ai, user)

if __name__ == "__main__":
    asyncio.run(debug_user_matching("srkreddy452@gmail.com"))
