import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService
import datetime
import uuid

load_dotenv(".env")
MONGO_URL = os.environ.get("MONGO_URL")

async def migrate_applications():
    if not MONGO_URL:
        print("No MONGO_URL found")
        return

    # 1. Connect to Mongo
    mongo_client = AsyncIOMotorClient(MONGO_URL)
    db = mongo_client.get_database("novaninjas")

    # 2. Get Supabase client
    supa_client = SupabaseService.get_client()

    print("Fetching MongoDB applications...")
    cursor = db.job_applications.find({})
    mongo_apps = await cursor.to_list(length=1000)
    print(f"Found {len(mongo_apps)} applications in MongoDB.")

    # Cache user profile UUIDs to avoid spamming Supabase
    user_id_cache = {}

    success_count = 0
    for app in mongo_apps:
        try:
            email = app.get("userEmail")
            if not email:
                continue

            if email not in user_id_cache:
                profile = SupabaseService.get_user_by_email(email)
                user_id_cache[email] = profile["id"] if profile else None
            
            user_id = user_id_cache[email]
            if not user_id:
                # User not migrated yet
                continue

            job_title = app.get("jobTitle") or "Unknown Role"
            company = app.get("company") or "Unknown Company"
            job_url = app.get("jobUrl") or app.get("sourceUrl") or ""

            # 3. Create a representation in the jobs table
            job_data = {
                "title": job_title,
                "company": company,
                "job_id": f"migrated-{app.get('_id', uuid.uuid4())}",
                "description": app.get("jobDescription") or "",
                "location": app.get("location") or "",
                "url": job_url
            }

            job_res = supa_client.table("jobs").insert(job_data).execute()
            if job_res.data:
                job_uuid = job_res.data[0]["id"]
            else:
                continue

            # 4. Insert into applications table
            createdAt = app.get("createdAt") or datetime.datetime.utcnow().isoformat()
            if isinstance(createdAt, datetime.datetime):
                createdAt = createdAt.isoformat()
                
            appliedAt = app.get("appliedAt")
            if isinstance(appliedAt, datetime.datetime):
                appliedAt = appliedAt.isoformat()

            app_doc = {
                "user_id": user_id,
                "job_id": job_uuid,
                "status": app.get("status", "applied"),
                "notes": app.get("notes"),
                "platform": app.get("location"),
                "applied_at": appliedAt,
                "created_at": createdAt
            }

            supa_client.table("applications").insert(app_doc).execute()
            success_count += 1
            
        except Exception as e:
            print(f"Failed to migrate app {app.get('_id')}: {str(e)}")

    print(f"Successfully migrated {success_count} applications to Supabase!")

if __name__ == "__main__":
    asyncio.run(migrate_applications())
