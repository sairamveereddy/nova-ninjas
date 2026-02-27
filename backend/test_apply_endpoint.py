import urllib.request
import urllib.parse
import urllib.error
import json

url = 'http://127.0.0.1:8000/api/ai-ninja/apply'
data = urllib.parse.urlencode({
    'jobId': '12345',
    'company': 'TestCompany',
    'jobTitle': 'Senior AI Engineer',
    'jobDescription': 'Testing the AI Ninja Apply pipeline.',
    'resumeText': 'I am a Software Engineer.'
}).encode('utf-8')

req = urllib.request.Request(url, data=data)

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
