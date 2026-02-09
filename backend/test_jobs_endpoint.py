import requests
import json

# Test the /api/jobs endpoint
url = "http://127.0.0.1:8000/api/jobs?limit=5"

try:
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
