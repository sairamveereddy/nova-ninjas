import requests
import time

url = "https://nova-ninjas-production.up.railway.app/api/jobs/refresh"

print(f"Triggering job refresh at {url}...")
try:
    response = requests.post(url)
    print(f"Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
