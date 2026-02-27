import asyncio
import sys
import os

# Ensure backend acts as root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from server import ai_ninja_apply

class MockRequest:
    async def form(self):
        return {
            "jobId": "123",
            "jobTitle": "Engineer",
            "company": "TestCorp",
            "jobDescription": "Build things.",
            "resumeText": "I am a builder."
        }

async def run_test():
    try:
        req = MockRequest()
        user = {
            "id": "test_user_id",
            "email": "test@test.com",
            "isVerified": True
        }
        print("Calling ai_ninja_apply...")
        res = await ai_ninja_apply(request=req, user=user)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run_test())
