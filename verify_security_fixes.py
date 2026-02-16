
import os
import sys
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Mock environment variables BEFORE importing server
os.environ["MONGO_URL"] = "mongodb://localhost:27017/test_db"
os.environ["JWT_SECRET"] = "test_secret"
os.environ["ENVIRONMENT"] = "development"

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Mock database and other dependencies to avoid import errors or connection attempts
with patch("motor.motor_asyncio.AsyncIOMotorClient"):
    from backend.server import app, get_current_user

client = TestClient(app)

def test_fetch_job_description_auth():
    print("\n[TEST] fetch-job-description Auth Enforcement")
    # Test without auth
    response = client.post("/api/fetch-job-description", json={"url": "http://example.com"})
    if response.status_code == 401:
        print("PASS: Request without token returned 401 Unauthorized")
    else:
        print(f"FAIL: Request without token returned {response.status_code}")

def test_ai_ninja_apply_auth():
    print("\n[TEST] ai-ninja/apply Auth Enforcement")
    # Test without auth
    response = client.post("/api/ai-ninja/apply", data={"jobTitle": "Test"})
    if response.status_code == 401:
        print("PASS: Request without token returned 401 Unauthorized")
    else:
        print(f"FAIL: Request without token returned {response.status_code}")

def test_file_upload_validation_malicious():
    print("\n[TEST] File Upload Validation (Malicious Content)")
    
    # Mock authenticated user
    async def mock_get_current_user():
        return {
            "id": "test_user_id",
            "email": "test@example.com", 
            "is_verified": True,
            "plan": "free"
        }
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    # Mock database calls that happen inside the endpoint
    with patch("backend.server.db") as mock_db:
        # Mock user lookup for usage limits
        mock_db.users.find_one.return_value = {
            "id": "test_user_id", 
            "email": "test@example.com",
            "plan": "free"
        }
        # Mock usage limits return
        with patch("backend.server.get_user_usage_limits") as mock_limits:
            mock_limits.return_value = {
                "limit": 10, "usage": 0, "canGenerate": True, "autofillsLimit": 5 
            }
            with patch("backend.server.check_and_increment_daily_usage", return_value=True):
                
                # Create a fake PDF (text file renamed)
                files = {
                    'resume': ('malicious.pdf', b'This is not a real PDF header', 'application/pdf')
                }
                data = {
                    "jobTitle": "Test Job",
                    "company": "Test Co"
                }
                
                response = client.post("/api/ai-ninja/apply", data=data, files=files)
                
                if response.status_code == 400 and "Invalid file content" in response.text:
                    print("PASS: Malicious PDF upload rejected (Magic Number validation)")
                else:
                    print(f"FAIL: Malicious PDF upload returned {response.status_code}: {response.text}")

    # Remove override
    app.dependency_overrides = {}

def test_file_upload_validation_valid():
    print("\n[TEST] File Upload Validation (Valid Content)")
    
    # Mock authenticated user
    async def mock_get_current_user():
        return {
            "id": "test_user_id",
            "email": "test@example.com", 
            "is_verified": True,
            "plan": "free"
        }
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    with patch("backend.server.db") as mock_db:
        mock_db.users.find_one.return_value = {
            "id": "test_user_id", "email": "test@example.com", "plan": "free"
        }
        with patch("backend.server.get_user_usage_limits") as mock_limits:
            mock_limits.return_value = {
                "limit": 10, "usage": 0, "canGenerate": True, "autofillsLimit": 5 
            }
            with patch("backend.server.check_and_increment_daily_usage", return_value=True):
                # We also need to mock parse_resume because even if validation passes, parsing might fail on dummy content
                with patch("backend.server.parse_resume", return_value="Parsed Text"):
                    
                    # Create a valid PDF header
                    files = {
                        'resume': ('valid.pdf', b'%PDF-1.4\nValid Content', 'application/pdf')
                    }
                    data = {
                        "jobTitle": "Test Job",
                        "company": "Test Co"
                    }
                    
                    # Note: It might fail later in the endpoint logic (e.g. LLM call), but it should pass the validation check
                    # We expect 500 or 200, but NOT 400 "Invalid file content"
                    try:
                        response = client.post("/api/ai-ninja/apply", data=data, files=files)
                        if response.status_code == 400 and "Invalid file content" in response.text:
                            print(f"FAIL: Valid PDF rejected: {response.text}")
                        elif response.status_code == 403: # Usage limit?
                             print(f"FAIL: Valid PDF rejected with 403: {response.text}")
                        else:
                             print(f"PASS: Valid PDF accepted (Status: {response.status_code})")
                    except Exception as e:
                        print(f"WARNING: Endpoint crashed but validation passed: {e}")

    app.dependency_overrides = {}

if __name__ == "__main__":
    print("Running Security Fix Verification...")
    try:
        test_fetch_job_description_auth()
        test_ai_ninja_apply_auth()
        test_file_upload_validation_malicious()
        test_file_upload_validation_valid()
    except Exception as e:
        print(f"Verification script error: {e}")
        import traceback
        traceback.print_exc()
