import requests
import uuid
import json

def test_real_signup():
    email = f"new_test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "Password123!",
        "name": "Test User",
        "referral_code": None,
        "turnstile_token": None
    }
    
    url = "https://jobninjas.ai/api/auth/signup"
    print(f"Testing signup for: {email}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_real_signup()
