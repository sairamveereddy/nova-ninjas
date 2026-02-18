import requests
import time

url = "http://localhost:8000/api/jobs/refresh"

print(f"Triggering LOCAL job refresh at {url}...")
try:
    response = requests.post(url)
    print(f"Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
