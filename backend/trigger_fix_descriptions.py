import requests
import time

url = "https://nova-ninjas-production.up.railway.app/api/debug/fix-descriptions"

print(f"Triggering description fix at {url}...")
try:
    response = requests.post(url)
    print(f"Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
