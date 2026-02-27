import requests
import uuid

def test_existing_signup():
    email = "srkreddy@gmail.com"
    url = "https://jobninjas.ai/api/auth/signup"
    payload = {
        "email": email,
        "password": "TestPassword123!",
        "name": "Test User",
        "turnstile_token": "dummy_token" # Secret key is missing anyway, so this triggers bypass-ish
    }
    
    print(f"Testing existing signup for: {email}")
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_existing_signup()
