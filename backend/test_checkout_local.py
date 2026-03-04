import requests
import json

def test_checkout():
    url = "http://localhost:8000/api/dodo-checkout"
    payload = {"plan_id": "ai-yearly"}
    # We need a token. Let's use a dummy one or try without (it will fail auth)
    # Actually we can't easily get a token without logging in.
    # I'll just check if it returns "Authentication required" instead of 404/500
    
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_checkout()
