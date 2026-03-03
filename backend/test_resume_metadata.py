import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def test():
    apps = SupabaseService.get_applications(limit=10)
    found_resume = False
    for a in apps:
        if "resumeId" in a:
            print(f"App {a['id']} has resumeId: {a['resumeId']}")
            found_resume = True
        elif "resumeText" in a:
            print(f"App {a['id']} has resumeText")
            found_resume = True
    
    if not found_resume:
        print("No apps in the first 10 had a resumeId or resumeText.")
        # Try specifically searching for one that had a resumeId in Mongo?
        client = SupabaseService.get_client()
        res = client.table("applications").select("*").execute()
        
        count = 0
        for r in res.data or []:
            meta = r.get("metadata") or {}
            if "resumeId" in meta and meta["resumeId"]:
                count += 1
                if count <= 3:
                     print(f"Found app with metadata resumeId: {meta['resumeId']}")
        print(f"Total apps in DB with resumeId in metadata: {count}")

test()
