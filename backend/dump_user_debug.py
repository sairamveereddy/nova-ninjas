
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def dump_user(email):
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    user = await db.users.find_one({"email": email})
    if not user:
        print("USER NOT FOUND")
        return
        
    uid = user.get("id") or str(user.get("_id"))
    print(f"--- DUMPING DATA FOR {email} (UID: {uid}) ---")
    
    # 1. Profile
    profile = await db.profiles.find_one({"$or": [{"userEmail": email}, {"userId": uid}, {"userId": str(user.get("_id"))}]})
    if profile:
        print("\nPROFILE DATA:")
        print(json.dumps(profile, indent=2, default=str))
    
    # 2. Saved Resumes
    saved = await db.saved_resumes.find({"$or": [{"userEmail": email}, {"userId": uid}]}).sort("uploadedAt", -1).to_list(length=5)
    print(f"\nSAVED RESUMES ({len(saved)} found):")
    for r in saved:
        print(f"- {r.get('fileName')} (uploaded: {r.get('uploadedAt')})")
        
    # 3. Resumes (different collection)
    others = await db.resumes.find({"$or": [{"userEmail": email}, {"userId": uid}]}).sort("createdAt", -1).to_list(length=5)
    print(f"\nRESUMES COLLECTION ({len(others)} found):")
    for r in others:
        print(f"- {r.get('fileName') or r.get('_id')} (created: {r.get('createdAt')})")
        if r.get('text_content'):
            print(f"  Preview: {r['text_content'][:200]}...")
        elif r.get('textContent'):
            print(f"  Preview: {r['textContent'][:200]}...")

if __name__ == "__main__":
    import sys
    email = sys.argv[1] if len(sys.argv) > 1 else "srkreddy452@gmail.com"
    asyncio.run(dump_user(email))
