import requests

# Test the /api/scan/parse endpoint
url = "http://127.0.0.1:8000/api/scan/parse"
headers = {"token": "test_token"}

# Create a dummy file
files = {"resume": ("test.txt", b"Test resume content", "text/plain")}

try:
    response = requests.post(url, headers=headers, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
