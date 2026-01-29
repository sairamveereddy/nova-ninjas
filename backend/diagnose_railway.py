#!/usr/bin/env python3
"""
Railway Deployment Diagnostic Script
Run this to check if the backend can start properly
"""

import sys
import os

print("=" * 60)
print("RAILWAY DEPLOYMENT DIAGNOSTIC")
print("=" * 60)

# Check Python version
print(f"\n1. Python Version: {sys.version}")
print(f"   Expected: 3.12.x")

# Check if we're in the right directory
print(f"\n2. Current Directory: {os.getcwd()}")
print(f"   server.py exists: {os.path.exists('server.py')}")
print(f"   requirements.txt exists: {os.path.exists('requirements.txt')}")

# Try importing critical modules
print("\n3. Testing Critical Imports:")
try:
    import fastapi
    print(f"   ✓ FastAPI: {fastapi.__version__}")
except ImportError as e:
    print(f"   ✗ FastAPI: {e}")
    sys.exit(1)

try:
    import uvicorn
    print(f"   ✓ Uvicorn: {uvicorn.__version__}")
except ImportError as e:
    print(f"   ✗ Uvicorn: {e}")
    sys.exit(1)

try:
    import motor
    print(f"   ✓ Motor (MongoDB): {motor.version}")
except ImportError as e:
    print(f"   ✗ Motor: {e}")
    sys.exit(1)

try:
    import openai
    print(f"   ✓ OpenAI: {openai.__version__}")
except ImportError as e:
    print(f"   ✗ OpenAI: {e}")

# Check environment variables
print("\n4. Environment Variables:")
env_vars = [
    "MONGO_URL",
    "DB_NAME", 
    "JWT_SECRET",
    "OPENAI_API_KEY",
    "RESEND_API_KEY",
    "FRONTEND_URL",
    "PORT"
]

for var in env_vars:
    value = os.environ.get(var)
    if value:
        # Mask sensitive data
        if "KEY" in var or "SECRET" in var or "URL" in var:
            display = f"{value[:10]}..." if len(value) > 10 else "***"
        else:
            display = value
        print(f"   ✓ {var}: {display}")
    else:
        print(f"   ✗ {var}: NOT SET")

# Try importing server module
print("\n5. Testing Server Import:")
try:
    import server
    print("   ✓ server.py imports successfully")
    print(f"   ✓ FastAPI app created: {hasattr(server, 'app')}")
except Exception as e:
    print(f"   ✗ Server import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Check if MongoDB client initialized
print("\n6. Database Connection:")
if hasattr(server, 'db') and server.db is not None:
    print("   ✓ MongoDB client initialized")
elif hasattr(server, 'db') and server.db is None:
    print("   ⚠ MongoDB client is None (will start in degraded mode)")
else:
    print("   ✗ MongoDB client not found")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
print("\nIf all checks pass, the server should start with:")
print("  uvicorn server:app --host 0.0.0.0 --port 8000")
print("\nIf MongoDB is None, check:")
print("  1. MONGO_URL environment variable is set")
print("  2. MongoDB Atlas network access allows 0.0.0.0/0")
print("  3. MongoDB connection string is correct")
