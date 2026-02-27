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
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
        return

    client = create_client(url, key)
    
    print(f"Connecting to: {url}")
    
    # 1. Check if applications table exists
    try:
        res = client.table("applications").select("*", count="exact").limit(1).execute()
        print(f"Applications table exists. Total rows: {res.count}")
        if res.data:
            print("Sample application data:", json.dumps(res.data[0], indent=2))
    except Exception as e:
        print(f"Error accessing applications table: {e}")

    # 2. Check if jobs table exists
    try:
        res = client.table("jobs").select("*", count="exact").limit(1).execute()
        print(f"Jobs table exists. Total rows: {res.count}")
    except Exception as e:
        print(f"Error accessing jobs table: {e}")

    # 3. Check specific user applications (Srk Reddy)
    # We'll check for both srkreddy452@gmail.com and other variants
    emails = ["srkreddy452@gmail.com", "srkreddy@gmail.com"]
    for email in emails:
        print(f"\nChecking applications for: {email}")
        try:
            # Lookup profile first
            profile_res = client.table("profiles").select("id").ilike("email", email).execute()
            if not profile_res.data:
                print(f"Profile not found for {email}")
                continue
            
            user_id = profile_res.data[0]["id"]
            print(f"User ID: {user_id}")
            
            # Check applications by user_id
            app_res = client.table("applications").select("*").eq("user_id", user_id).execute()
            print(f"Applications found by user_id: {len(app_res.data)}")
            
            # Check applications by user_email
            app_email_res = client.table("applications").select("*").eq("user_email", email).execute()
            print(f"Applications found by user_email: {len(app_email_res.data)}")
            
        except Exception as e:
            print(f"Error checking user data: {e}")

if __name__ == "__main__":
    asyncio.run(check_supabase())
