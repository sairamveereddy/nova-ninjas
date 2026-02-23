import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client
import uuid
import datetime

load_dotenv(".env")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "novaninjas")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

mongo_client = AsyncIOMotorClient(MONGO_URL, tlsAllowInvalidCertificates=True)
db = mongo_client[DB_NAME]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def migrate_users():
    print("🚀 Starting User Migration to Supabase Auth...")
    cursor = db.users.find({})
    total = await db.users.count_documents({})
    print(f"Found {total} users in MongoDB.")
    
    auth_users_resp = supabase.auth.admin.list_users()
    auth_users_map = {u.email: u.id for u in auth_users_resp}

    success = 0
    errors = 0

    async for user in cursor:
        email = user.get("email")
        if not email:
            print(f"Skipping user without email: {user.get('_id')}")
            continue
            
        try:
            name = user.get("name") or user.get("fullName") or ""
            role = user.get("role", "customer")
            plan = user.get("plan", "free")
            is_verified = user.get("is_verified", False)
            
            uid = auth_users_map.get(email)
            if not uid:
                try:
                    res = supabase.auth.admin.create_user({
                        "email": email,
                        "password": "tempPassword123!",
                        "email_confirm": True,
                    })
                    uid = res.user.id
                    auth_users_map[email] = uid
                except Exception as e:
                    print(f"Failed to create user {email}: {e}")
                    continue
                    
            # Update public.profiles
            profile_data = {
                "id": uid,
                "email": email,
                "name": name,
                "role": role,
                "plan": plan,
                "is_verified": is_verified,
                "summary": user.get("summary"),
                "resume_text": user.get("resume_text") or user.get("resumeText"),
                "latest_resume": user.get("latest_resume"),
                "profile_picture": user.get("profile_picture") or user.get("picture"),
            }
            if user.get("created_at"):
                profile_data["created_at"] = user.get("created_at") if isinstance(user.get("created_at"), str) else user.get("created_at").isoformat()
            elif user.get("createdAt"):
                profile_data["created_at"] = user.get("createdAt") if isinstance(user.get("createdAt"), str) else user.get("createdAt").isoformat()
            
            # Clean none
            profile_data = {k: v for k, v in profile_data.items() if v is not None}
            profile_data.pop("profile_picture", None)
            
            supabase.table("profiles").upsert(profile_data, on_conflict="email").execute()
            
            success += 1
            print(f"Migrated {success}/{total}: {email}", end="\r")
        except Exception as e:
            errors += 1
            print(f"\nError migrating {email}: {e}")

    print(f"\n✅ Completed User Migration: {success} successful, {errors} errors.")
    mongo_client.close()

if __name__ == "__main__":
    asyncio.run(migrate_users())
