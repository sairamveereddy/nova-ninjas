import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def make_admin():
    email = "srkreddy452@gmail.com"
    user = SupabaseService.get_user_by_email(email)
    if user:
        user_id = user.get("id")
        update_doc = {
            "role": "admin"
        }
        ok = SupabaseService.update_user_profile(user_id, update_doc)
        if ok:
            print(f"Successfully updated {email} role to 'admin'")
        else:
            print("Failed to update in Supabase.")
    else:
        print(f"User {email} not found.")

make_admin()
