import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")
client = SupabaseService.get_client()

try:
    # Just look at ALL applications natively
    res = client.table("applications").select("*").execute()
    apps = res.data or []
    print(f"Total apps: {len(apps)}")
    
    with_user_id = [a for a in apps if a.get("user_id")]
    print(f"Apps with a non-null user_id: {len(with_user_id)}")
    
    # Try looking for srkreddy user
    profile = SupabaseService.get_user_by_email("srkreddy@gmail.com")
    if profile:
        print(f"Finding apps for {profile['id']}...")
        user_apps = client.table("applications").select("*").eq("user_id", profile['id']).execute()
        print(f"Found {len(user_apps.data or [])} apps.")
    else:
        print("No profile srkreddy@gmail.com")
except Exception as e:
    print(f"Error fetching: {str(e)}")
