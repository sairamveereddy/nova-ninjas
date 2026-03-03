import asyncio
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def set_pro():
    email = "srkreddy452@gmail.com"
    user = SupabaseService.get_user_by_email(email)
    if user:
        user_id = user.get("id")
        one_year_later = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        update_doc = {
            "plan": "pro",
            "plan_expires_at": one_year_later
        }
        ok = SupabaseService.update_user_profile(user_id, update_doc)
        if ok:
            print(f"Successfully updated {email} to PRO until {one_year_later}")
        else:
            print("Failed to update in Supabase.")
    else:
        print(f"User {email} not found.")

set_pro()
