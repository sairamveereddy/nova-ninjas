import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client

load_dotenv(".env")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "novaninjas")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

mongo_client = AsyncIOMotorClient(MONGO_URL, tlsAllowInvalidCertificates=True)
db = mongo_client[DB_NAME]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def clear_table(table_name):
    print(f"Clearing orphans from {table_name}...")
    try:
        # Supabase Python client doesn't support deleting without a filter easily, so we delete where id is not null
        supabase.table(table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"Error clearing {table_name}: {e}")

async def get_valid_keys(table_name, select_col="id"):
    try:
        res = supabase.table(table_name).select(select_col).execute()
        return {item[select_col] for item in res.data} if res.data else set()
    except Exception as e:
        print(f"Warning: Could not fetch {table_name} keys for validation: {e}")
        return set()

async def migrate_collection(collection_name, table_name, transform_func=None, valid_users=None, valid_jobs=None):
    print(f"\n--- Migrating {collection_name} to {table_name} ---")
    cursor = db[collection_name].find({})
    total = await db[collection_name].count_documents({})
    success = 0
    errors = 0
    batch = []
    
    async for doc in cursor:
        try:
            doc.pop("_id", None)
            if transform_func:
                doc = transform_func(doc)
                if not doc:
                    continue
            
            if "_raw_user_id" in doc:
                raw_user = doc.pop("_raw_user_id")
                # Now the valid_users should be populated from Supabase!
                if valid_users and str(raw_user) in valid_users:
                    doc["user_id"] = str(raw_user)
                else:
                    # Try finding by email from the doc if available
                    pass
                    
            if "_raw_job_id" in doc:
                raw_job = doc.pop("_raw_job_id")
                if valid_jobs and str(raw_job) in valid_jobs:
                    doc["job_id"] = str(raw_job)
                    
            for key, val in doc.items():
                if isinstance(val, bool) or isinstance(val, int) or val is None or isinstance(val, float) or isinstance(val, dict):
                    pass
                elif not isinstance(val, str):
                    doc[key] = str(val)
                    
            batch.append(doc)
            if len(batch) >= 100:
                supabase.table(table_name).insert(batch).execute()
                success += len(batch)
                batch = []
                print(f"Migrated {success}/{total}...", end="\r")
        except Exception as e:
            errors += 1
            print(f"Doc error: {e}")
            
    if batch:
        try:
            supabase.table(table_name).insert(batch).execute()
            success += len(batch)
        except Exception as e:
            errors += len(batch)
            print(f"Final batch error: {e}")
            
    print(f"\n✅ Completed {collection_name}: {success} successful, {errors} errors.")

# Transform Functions
def transform_application(doc):
    app_doc = {
        "status": doc.get("status", "applied"),
        "platform": doc.get("company"),
        "applied_at": doc.get("appliedAt", doc.get("createdAt")),
        "_raw_user_id": doc.get("userId"),
        "_raw_job_id": doc.get("jobId")
    }
    return app_doc

def transform_scan(doc):
    scan_doc = {
        "user_email": doc.get("userEmail"),
        "raw_text": doc.get("jobDescription", "")[:5000],
        "extracted_data": {
            "jobTitle": doc.get("jobTitle"),
            "company": doc.get("company"),
            "analysis": doc.get("analysis"),
            "matchScore": doc.get("matchScore")
        },
        "created_at": doc.get("createdAt"),
        "_raw_user_id": doc.get("userId")
    }
    return scan_doc

def transform_saved_resume(doc):
    if doc.get("isBase"): return None
    resume_doc = {
        "resume_name": doc.get("resumeName"),
        "job_title": doc.get("jobTitle"),
        "company_name": doc.get("companyName"),
        "resume_text": doc.get("resumeText"),
        "is_system_generated": doc.get("isSystemGenerated", True),
        "origin": doc.get("origin"),
        "created_at": doc.get("createdAt"),
        "_raw_user_id": doc.get("userId")
    }
    return resume_doc

async def main():
    print("🚀 Re-Linking Orphaned User Data...")
    valid_users = await get_valid_keys("profiles")
    valid_jobs = await get_valid_keys("jobs")
    print(f"Found {len(valid_users)} valid users and {len(valid_jobs)} jobs.")
    
    await clear_table("applications")
    await clear_table("scans")
    await clear_table("saved_resumes")
    
    await migrate_collection("applications", "applications", transform_application, valid_users, valid_jobs)
    await migrate_collection("scans", "scans", transform_scan, valid_users)
    await migrate_collection("resumes", "saved_resumes", transform_saved_resume, valid_users)
    
    mongo_client.close()

if __name__ == "__main__":
    asyncio.run(main())
