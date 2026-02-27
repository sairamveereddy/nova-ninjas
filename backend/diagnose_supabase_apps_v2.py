import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
import json

async def check_supabase():
    load_dotenv()
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        return

    client = create_client(url, key)
    
    # Check applications with user_id
    try:
        res = client.table("applications").select("*", count="exact").not_.is_("user_id", "null").limit(5).execute()
        print(f"Applications with non-null user_id: {res.count}")
        if res.data:
            print("Sample data with user_id:", json.dumps(res.data[0], indent=2))
    except Exception as e:
        print(f"Error checking non-null user_id: {e}")

    # Check columns in applications
    try:
        # We can't easily list columns from the client, so we try a select on specific columns
        cols = ["id", "user_id", "status", "company", "job_title", "user_email"]
        for col in cols:
            try:
                client.table("applications").select(col).limit(1).execute()
                print(f"Column '{col}' exists.")
            except Exception:
                print(f"Column '{col}' DOES NOT exist.")
    except Exception as e:
        print(f"Error checking columns: {e}")

    # Check user srkreddy452@gmail.com profile again
    try:
        email = "srkreddy452@gmail.com"
        profile_res = client.table("profiles").select("id", "email").ilike("email", email).execute()
        if profile_res.data:
            prof = profile_res.data[0]
            print(f"\nProfile found: {prof}")
            uid = prof["id"]
            
            # Count applications for this UID
            app_res = client.table("applications").select("*", count="exact").eq("user_id", uid).execute()
            print(f"Applications for UID {uid}: {app_res.count}")
        else:
            print(f"\nProfile NOT found for {email}")
    except Exception as e:
        print(f"Error checking specific profile: {e}")

if __name__ == "__main__":
    asyncio.run(check_supabase())
