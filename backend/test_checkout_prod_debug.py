import requests
import json

def test_prod_checkout():
    url = "https://nova-ninjas-production.up.railway.app/api/dodo-checkout"
    payload = {"plan_id": "ai-yearly"}
    
    # Try without token first to see if it gives 401
    response = requests.post(url, json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_prod_checkout()
