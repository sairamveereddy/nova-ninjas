import os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase_service import SupabaseService

client = SupabaseService.get_client()
try:
    # Fetch 1 profile to see the keys
    res = client.table("profiles").select("*").limit(1).execute()
    if res.data:
        keys = list(res.data[0].keys())
        print(f"Columns in 'profiles' table ({len(keys)}):")
        for i in range(0, len(keys), 5):
            print(", ".join(keys[i:i+5]))
    else:
        print("No data in 'profiles' table yet.")
except Exception as e:
    print(f"Error fetching schema: {e}")
