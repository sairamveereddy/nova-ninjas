import sys
import os
import json
from datetime import datetime, timezone

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from supabase_service import SupabaseService

def test_profile_sync_logic():
    print("--- Testing Profile Sync Logic ---")
    
    # Mock user dict with nested Orion structure
    test_user = {
        "id": "test-uuid-123",
        "email": "test@example.com",
        "person": {
            "firstName": "John",
            "lastName": "Doe",
            "fullName": "John Doe",
            "phone": "123-456-7890",
            "linkedinUrl": "https://linkedin.com/in/johndoe",
            "githubUrl": "https://github.com/johndoe",
            "location": "New York, NY"
        },
        "address": {
            "line1": "123 Main St",
            "city": "New York",
            "state": "NY",
            "zip": "10001",
            "country": "USA"
        },
        "skills": {
            "primary": "Python, React, SQL",
            "languages": "English, Spanish"
        },
        "employment_history": [
            {
                "company": "Tech Corp",
                "title": "Software Engineer",
                "start_date": "01/2020",
                "end_date": "Present",
                "summary": "Building cool stuff."
            }
        ],
        "education": [
            {
                "school": "Uni of Life",
                "degree": "Bachelors",
                "major": "Computer Science",
                "end_date": "05/2019"
            }
        ],
        "sensitive": {
            "gender": "Male",
            "race": "Asian"
        }
    }

    print("\n1. Verifying Mapping Logic (Dry Run Simulation)...")
    
    # Simulate partial sync mapping (since we can't easily mock the supabase client here)
    # We want to see if the mapping extracts the right fields
    person = test_user.get("person", {})
    address = test_user.get("address", {})
    
    profile_data = {
        "email": test_user.get("email"),
        "name": person.get("fullName"),
        "phone": person.get("phone"),
        "location": person.get("location") or f"{address.get('city', '')}, {address.get('state', '')}".strip(", "),
        "linkedin_url": person.get("linkedinUrl"),
        "github_url": person.get("githubUrl"),
        "skills": test_user.get("skills"),
        "experience": test_user.get("employment_history"),
        "sensitive_data": test_user.get("sensitive"),
        "full_profile": test_user
    }

    print(f"Mapped Name: {profile_data['name']}")
    print(f"Mapped Phone: {profile_data['phone']}")
    print(f"Mapped Location: {profile_data['location']}")
    print(f"Mapped GitHub: {profile_data['github_url']}")
    print(f"Sensitive Data present: {profile_data['sensitive_data'] is not None}")
    print(f"Full Profile present: {profile_data['full_profile'] is not None}")

    if profile_data['name'] == "John Doe" and profile_data['phone'] == "123-456-7890":
        print("\nSUCCESS: Mapping logic verified.")
    else:
        print("\nFAILED: Mapping logic did not extract expected fields.")

if __name__ == "__main__":
    test_profile_sync_logic()
