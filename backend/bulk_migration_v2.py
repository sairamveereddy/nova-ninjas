import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client

# Load environment variables
load_dotenv(".env")

# Source: MongoDB
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "novaninjas")

# Destination: Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not all([MONGO_URL, SUPABASE_URL, SUPABASE_KEY]):
    print("❌ ERROR: Missing required environment variables. Check .env file.")
    exit(1)

# Initialize clients
mongo_client = AsyncIOMotorClient(
    MONGO_URL,
    tlsAllowInvalidCertificates=True
)
db = mongo_client[DB_NAME]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def migrate_collection(collection_name, table_name, transform_func=None, valid_users=None, valid_jobs=None):
    """Generic migration function for a single collection."""
    print(f"\n--- Migrating {collection_name} to {table_name} ---")
    
    cursor = db[collection_name].find({})
    total = await db[collection_name].count_documents({})
    print(f"Found {total} documents to migrate.")
    
    success = 0
    errors = 0
    
    batch = []
    batch_size = 100
    
    async for doc in cursor:
        try:
            doc.pop("_id", None)  # Remove Mongo ID
            
            if transform_func:
                doc = transform_func(doc)
                if not doc:
                    continue
            
            # Foreign Key Validation
            if "_raw_user_id" in doc:
                raw_user = doc.pop("_raw_user_id")
                if valid_users and raw_user in valid_users:
                    doc["user_id"] = raw_user
                    
            if "_raw_job_id" in doc:
                raw_job = doc.pop("_raw_job_id")
                if valid_jobs and raw_job in valid_jobs:
                    doc["job_id"] = raw_job
                    
            # Ensure dates are strings
            for key, val in doc.items():
                if isinstance(val, datetime):
                    doc[key] = val.isoformat()
                    
            batch.append(doc)
            
            if len(batch) >= batch_size:
                supabase.table(table_name).insert(batch).execute()
                success += len(batch)
                batch = []
                print(f"Migrated {success}/{total}...", end="\r")
                
        except Exception as e:
            errors += 1
            print(f"Error processing doc: {e}")
            
    if batch:
        try:
            supabase.table(table_name).insert(batch).execute()
            success += len(batch)
        except Exception as e:
            errors += len(batch)
            print(f"Error on final batch: {e}")
            
    print(f"\n✅ Completed {collection_name}: {success} successful, {errors} errors.")


# --- Transformations ---

def transform_application(doc):
    import uuid
    
    # Supabase expects valid UUIDs for references. If user_id or job_id are legacy Mongo ObjectIds, we drop them to avoid 22P02 errors.
    def is_valid_uuid(val):
        try:
            uuid.UUID(str(val))
            return True
        except ValueError:
            return False
            
    app_doc = {
        "status": doc.get("status", "applied"),
        "platform": doc.get("company"),
        "applied_at": doc.get("appliedAt", doc.get("createdAt")),
    }
    
    # Validation will happen in the main loop before batch appending
    app_doc["_raw_user_id"] = doc.get("userId")
    app_doc["_raw_job_id"] = doc.get("jobId")
    return app_doc

def is_valid_uuid(val):
    import uuid
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

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
        "created_at": doc.get("createdAt")
    }
    scan_doc["_raw_user_id"] = doc.get("userId")
    return scan_doc

def transform_saved_resume(doc):
    if doc.get("isBase"): return None # handled separately if needed
    
    resume_doc = {
        "resume_name": doc.get("resumeName"),
        "job_title": doc.get("jobTitle"),
        "company_name": doc.get("companyName"),
        "resume_text": doc.get("resumeText"),
        "is_system_generated": doc.get("isSystemGenerated", True),
        "origin": doc.get("origin"),
        "created_at": doc.get("createdAt")
    }
    
    resume_doc["_raw_user_id"] = doc.get("userId")
    return resume_doc

def transform_daily_usage(doc):
    return {
        "email": doc.get("email"),
        "date": doc.get("date"),
        "apps": doc.get("apps", 0),
        "autofills": doc.get("autofills", 0)
    }

def transform_user_consent(doc):
    return {
        "email": doc.get("email"),
        "consent_type": doc.get("consent_type"),
        "consent_given": doc.get("consent_given", False),
        "consent_date": doc.get("consent_date")
    }
    
def transform_contact_message(doc):
    return {
        "name": doc.get("name", f"{doc.get('firstName', '')} {doc.get('lastName', '')}".strip()),
        "email": doc.get("email"),
        "subject": doc.get("subject"),
        "message": doc.get("message"),
        "status": doc.get("status", "unread"),
        "created_at": doc.get("created_at")
    }


async def get_valid_keys(table_name, select_col="id"):
    try:
        res = supabase.table(table_name).select(select_col).execute()
        return {item[select_col] for item in res.data} if res.data else set()
    except Exception as e:
        print(f"Warning: Could not fetch {table_name} keys for validation: {e}")
        return set()

async def main():
    print("🚀 Starting Phase 4 Bulk Migration to Supabase...")
    
    # Pre-fetch valid foreign keys to prevent 23503 errors
    print("Fetching valid Profiles and Jobs from Supabase for FK validation...")
    valid_users = await get_valid_keys("profiles")
    valid_jobs = await get_valid_keys("jobs")
    print(f"Found {len(valid_users)} valid users and {len(valid_jobs)} valid jobs.")
    
    await migrate_collection("applications", "applications", transform_application, valid_users, valid_jobs)
    await migrate_collection("scans", "scans", transform_scan, valid_users)
    await migrate_collection("resumes", "saved_resumes", transform_saved_resume, valid_users)
    await migrate_collection("daily_usage", "daily_usage", transform_daily_usage)
    await migrate_collection("user_consents", "user_consents", transform_user_consent)
    await migrate_collection("contact_messages", "contact_messages", transform_contact_message)
    
    print("\n🎉 Migration Complete! You may now drop the MongoDB instance if Phase 1-3 migrations are also complete.")
    mongo_client.close()

if __name__ == "__main__":
    asyncio.run(main())
