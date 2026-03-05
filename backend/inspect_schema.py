from supabase_service import SupabaseService
import json
import os
from dotenv import load_dotenv
from pathlib import Path

# Load env
load_dotenv(Path(__file__).parent / '.env')

def inspect_profiles_schema():
    client = SupabaseService.get_client()
    if not client:
        print("Failed to get client")
        return
        
    try:
        # Get one record to see columns
        response = client.table("profiles").select("*").limit(1).execute()
        if response.data:
            print("--- Profiles Schema ---")
            columns = sorted(list(response.data[0].keys()))
            for i in range(0, len(columns), 4):
                print(", ".join(columns[i:i+4]))
            
            # check the srk user specifically
            srk = client.table("profiles").select("*").eq("email", "srkreddy452@gmail.com").execute()
            if srk.data:
                print("\n--- SRK Profile Data ---")
                p = srk.data[0]
                for k, v in p.items():
                    if v is not None and v != "" and k not in ['id', 'resume_content', 'embedding']:
                        print(f"{k}: {v}")
        else:
            print("No records found in 'profiles'")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_profiles_schema()
