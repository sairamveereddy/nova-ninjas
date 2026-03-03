import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def test():
    user = SupabaseService.get_user_by_email("srkreddy452@gmail.com")
    if user:
        print("Plan:", user.get("plan"))
        print("Plan Expires At:", user.get("plan_expires_at"))
        print("Subscription:", user.get("subscription"))
test()
