import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid
from dotenv import load_dotenv
from supabase_service import SupabaseService
import datetime

load_dotenv(".env")
MONGO_URL = os.environ.get("MONGO_URL")

async def migrate():
    print("Connecting to Mongo and Supabase...")
    mongo_client = AsyncIOMotorClient(MONGO_URL, tlsAllowInvalidCertificates=True)
    db = mongo_client["novaninjas"]
    supa_client = SupabaseService.get_client()

    print("Cleaning up orphaned applications in Supabase...")
    # Delete where user_id is null
    supa_client.table("applications").delete().is_("user_id", "null").execute()
    print("Orphaned apps cleaned up.")

    print("Fetching MongoDB applications...")
    cursor = db["applications"].find({})
    mongo_apps = await cursor.to_list(length=10000)
    print(f"Found {len(mongo_apps)} applications in Mongo to migrate.")

    success = 0
    skipped = 0
    errors = 0

    skip_no_email = 0
    skip_no_profile = 0
    skip_existing = 0

    user_cache = {}

    for app in mongo_apps:
        try:
            email = app.get("userEmail")
            if not email:
                skipped += 1
                skip_no_email += 1
                continue

            if email not in user_cache:
                profile = SupabaseService.get_user_by_email(email)
                user_cache[email] = profile["id"] if profile else None
            
            user_id = user_cache[email]
            if not user_id:
                # Still skips if user completely missing in Supabase profiles
                skipped += 1
                skip_no_profile += 1
                continue
                
            job_title = app.get("jobTitle") or app.get("role") or "Unknown Role"
            company = app.get("company") or app.get("platform") or "Unknown Company"
            job_url = app.get("jobUrl") or app.get("sourceUrl") or ""

            # We skip the "existing" check based on company/title because a user
            # could apply to multiple "Unknown Company" / "Unknown Role" jobs or 
            # multiple identical titled jobs at the same company. We trust Mongo's _id.

            createdAt = app.get("createdAt") or datetime.datetime.utcnow().isoformat()
            if isinstance(createdAt, datetime.datetime):
                createdAt = createdAt.isoformat()
                
            appliedAt = app.get("appliedAt") or createdAt
            if isinstance(appliedAt, datetime.datetime):
                appliedAt = appliedAt.isoformat()

            try:
                # Create a corresponding job entry
                job_data = {
                    "title": job_title,
                    "company": company,
                    "job_id": f"remigrated-{app.get('_id', uuid.uuid4())}",
                    "description": app.get("jobDescription", ""),
                    "location": app.get("location", "")
                }
                job_res = supa_client.table("jobs").insert(job_data).execute()
                job_uuid = job_res.data[0]["id"] if job_res.data else None
            except Exception as e:
                # The job might already exist (unique constraint) or have some formatting error
                # If it's a unique constraint, we can just look up the job
                if '23505' in str(e): # Duplicate key
                    job_uuid_lookup = supa_client.table("jobs").select("id").eq("job_id", f"remigrated-{app.get('_id')}").execute()
                    if job_uuid_lookup.data:
                        job_uuid = job_uuid_lookup.data[0]["id"]
                    else:
                        job_uuid = None
                else:
                    job_uuid = None

            app_doc = {
                "user_id": user_id,
                "job_id": job_uuid,
                "user_email": email,
                "job_title": job_title,
                "company": company,
                "job_url": job_url,
                "status": app.get("status", "materials_ready"),
                "notes": app.get("notes", ""),
                "platform": app.get("location", ""),
                "applied_at": appliedAt,
                "created_at": createdAt,
                "metadata": {
                    "matchScore": app.get("matchScore"),
                    "resumeId": str(app.get("resumeId")) if app.get("resumeId") else None,
                    "origin": app.get("origin", "ai-ninja")
                }
            }
            
            supa_client.table("applications").insert(app_doc).execute()
            success += 1
            if success % 20 == 0:
                print(f"Migrated {success} / {len(mongo_apps)}...")
        except Exception as e:
            errors += 1
            print(f"Error on app {app.get('_id')}: {e}")

    print(f"Migration complete: {success} migrated, {skipped} skipped, {errors} errors.")
    print(f"Skip reasons: No Email={skip_no_email}, No Profile={skip_no_profile}, Already Exists={skip_existing}")

if __name__ == "__main__":
    asyncio.run(migrate())
