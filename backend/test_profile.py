import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def test():
    user = SupabaseService.get_user_by_email("srkreddy452@gmail.com")
    print("User keys:", user.keys() if user else "None")
    if user:
        print("Has full_profile:", "full_profile" in user)
        if "full_profile" in user and user["full_profile"]:
            print("full_profile keys:", user["full_profile"].keys())
        print("Has person:", "person" in user)
        print("Has address:", "address" in user)
        
test()
