import asyncio
import os
from dotenv import load_dotenv
from supabase_service import SupabaseService

load_dotenv(".env")

def check_admin():
    email = "srkreddy452@gmail.com"
    user = SupabaseService.get_user_by_email(email)
    print("User role in DB:", user.get("role"))

check_admin()
