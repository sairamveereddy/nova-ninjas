import asyncio
from dotenv import load_dotenv
load_dotenv()
from supabase_service import SupabaseService

def main():
    email = "srkreddy@gmail.com"
    profile = SupabaseService.get_user_by_email(email)
    
    if not profile:
        print(f"No profile found for {email}")
        return

    user_id = profile.get("id")
    print(f"Found User ID: {user_id}")
    
    apps_by_id = SupabaseService.get_applications(user_id=user_id)
    print(f"Applications queried by user_id: {len(apps_by_id)}")
    
    apps_by_email = SupabaseService.get_applications(user_email=email)
    print(f"Applications queried by user_email: {len(apps_by_email)}")

    client = SupabaseService.get_client()
    raw_res = client.table("applications").select("*").execute()
    apps = raw_res.data or []
    print(f"Total applications in DB: {len(apps)}")
    with_user_id = [a for a in apps if a.get("user_id")]
    with_email = [a for a in apps if a.get("user_email")]
    print(f"Apps with user_id: {len(with_user_id)}")
    print(f"Apps with user_email: {len(with_email)}")
    
    if apps:
        print("Sample of first 3 apps:")
        for a in apps[:3]:
            print(f"- id: {a.get('id')}, user_id: {a.get('user_id')}, email: {a.get('user_email')}, company: {a.get('company')}")

if __name__ == "__main__":
    main()
