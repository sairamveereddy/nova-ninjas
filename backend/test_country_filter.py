import requests
import json

# Test the /api/jobs endpoint with different country filters
test_cases = [
    {"name": "No filter", "url": "http://127.0.0.1:8000/api/jobs?limit=5"},
    {"name": "USA filter", "url": "http://127.0.0.1:8000/api/jobs?limit=5&country=usa"},
    {"name": "US filter", "url": "http://127.0.0.1:8000/api/jobs?limit=5&country=us"},
    {"name": "GB filter", "url": "http://127.0.0.1:8000/api/jobs?limit=5&country=gb"},
]

for test in test_cases:
    print(f"\n{'='*60}")
    print(f"Test: {test['name']}")
    print(f"URL: {test['url']}")
    print('='*60)
    try:
        response = requests.get(test['url'])
        data = response.json()
        print(f"Status: {response.status_code}")
        print(f"Total Jobs: {data.get('pagination', {}).get('total', 0)}")
        print(f"Jobs Returned: {len(data.get('jobs', []))}")
        if data.get('jobs'):
            print(f"First job country: {data['jobs'][0].get('country', 'N/A')}")
    except Exception as e:
        print(f"Error: {e}")
