import os
import asyncio
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

async def check_recent_users():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    sb = create_client(url, key)
    
    # 24 hours ago
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    print(f"Checking for users created after {cutoff}...")
    
    response = sb.table("profiles").select("*").gt("created_at", cutoff).execute()
    users = response.data
    
    print(f"Found {len(users)} users who signed up in the last 24 hours.")
    for u in users:
        print(f"- {u.get('email')} (Verified: {u.get('is_verified')})")

if __name__ == "__main__":
    asyncio.run(check_recent_users())
