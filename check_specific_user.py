import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"))

def check_user_exists():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    client = create_client(url, key)
    
    email = "srkreddy45@gmail.com"
    try:
        res = client.table("profiles").select("*").eq("email", email).execute()
        if res.data:
            print(f"✅ User {email} EXISTS in profiles.")
            print(res.data[0])
        else:
            print(f"❌ User {email} DOES NOT EXIST in profiles.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_user_exists()
