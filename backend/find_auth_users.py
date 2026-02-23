import os, asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import re

load_dotenv('.env')
m = AsyncIOMotorClient(os.environ.get('MONGO_URL'), tlsAllowInvalidCertificates=True)
db = m[os.environ.get('DB_NAME','novaninjas')]

async def search_db():
    print("Searching for harshith and spandana across all collections...")
    collections = await db.list_collection_names()
    
    for coll_name in collections:
        coll = db[coll_name]
        
        # Search for harshith
        harshith_cursor = coll.find({"$or": [
            {"name": {"$regex": "harshith", "$options": "i"}},
            {"email": {"$regex": "harshith", "$options": "i"}},
            {"fullName": {"$regex": "harshith", "$options": "i"}}
        ]})
        h_docs = await harshith_cursor.to_list(100)
        if h_docs:
            print(f"Found 'harshith' in collection '{coll_name}': {len(h_docs)} docs")
            for d in h_docs:
                print(f"  - {d.get('email', 'No email')} | {d.get('name', d.get('fullName', 'No name'))}")

        # Search for spandana
        spandana_cursor = coll.find({"$or": [
            {"name": {"$regex": "spandana", "$options": "i"}},
            {"email": {"$regex": "spandana", "$options": "i"}},
            {"fullName": {"$regex": "spandana", "$options": "i"}}
        ]})
        s_docs = await spandana_cursor.to_list(100)
        if s_docs:
            print(f"Found 'spandana' in collection '{coll_name}': {len(s_docs)} docs")
            for d in s_docs:
                print(f"  - {d.get('email', 'No email')} | {d.get('name', d.get('fullName', 'No name'))}")

if __name__ == '__main__':
    asyncio.run(search_db())
    m.close()
