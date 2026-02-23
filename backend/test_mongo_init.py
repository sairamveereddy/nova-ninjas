import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(".")
load_dotenv(ROOT_DIR / ".env")

db_name = os.environ.get("DB_NAME", "novaninjas")
mongo_url = os.environ.get("MONGO_URL")

print(f"MONGO_URL: {'set' if mongo_url else 'MISSING'}")
print(f"DB_NAME: {db_name}")

try:
    if not mongo_url:
        print("ERROR: MONGO_URL not found in environment!")
        sys.exit(1)
        
    client = AsyncIOMotorClient(
        mongo_url,
        tlsAllowInvalidCertificates=True
    )
    db = client[db_name]
    print(f"✅ MongoDB client initialized for database: {db_name}")
    
    # Try a simple operation to confirm connection
    import asyncio
    async def test_conn():
        try:
            await client.admin.command('ping')
            print("✅ MongoDB ping successful!")
        except Exception as e:
            print(f"❌ MongoDB ping failed: {e}")
            
    asyncio.run(test_conn())
    
except Exception as e:
    print(f"❌ Failed to initialize MongoDB client: {str(e)}")
