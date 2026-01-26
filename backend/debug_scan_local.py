
import asyncio
import os
import sys
from fastapi import UploadFile

# Mock DB if needed or let it fail on connection but load the function
import server
from server import scan_resume

async def run_test():
    print("Testing scan_resume...")
    try:
        # Mock file
        class MockFile:
            filename = "test_resume.txt"
            async def read(self):
                return b"Test resume content with python and javascript skills."
        
        mock_upload = MockFile()
        job_description = "We need a python developer."
        email = "test@example.com"
        
        print("Calling scan_resume...")
        result = await scan_resume(resume=mock_upload, job_description=job_description, email=email)
        print("Result:", result)

    except NameError as ne:
        print(f"CAUGHT NAME ERROR: {ne}")
        import traceback
        traceback.print_exc()
    except Exception as e:
        print(f"CAUGHT EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Ensure OPENAI_API_KEY is parsed if needed (it is now conditional)
    asyncio.run(run_test())
