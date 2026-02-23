import os, asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv('.env')

async def search_dbs():
    m = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    dbs = ['nova-ninjas', 'nova_ninjas', 'novaninjas']
    
    for db_name in dbs:
        print(f"\n--- Searching in DB: {db_name} ---")
        db = m[db_name]
        try:
            total_users = await db.users.count_documents({})
            print(f"Total users in {db_name}.users: {total_users}")
            
            # Search for harshith
            h_count = await db.users.count_documents({"$or": [
                {"name": {"$regex": "harshith", "$options": "i"}},
                {"email": {"$regex": "harshith", "$options": "i"}},
                {"fullName": {"$regex": "harshith", "$options": "i"}}
            ]})
            if h_count: print(f"Found 'harshith': {h_count} docs")
            
            # Search for spandana
            s_count = await db.users.count_documents({"$or": [
                {"name": {"$regex": "spandana", "$options": "i"}},
                {"email": {"$regex": "spandana", "$options": "i"}},
                {"fullName": {"$regex": "spandana", "$options": "i"}}
            ]})
            if s_count: print(f"Found 'spandana': {s_count} docs")
            
        except Exception as e:
            print("Error accessing db:", e)
            
    m.close()

if __name__ == '__main__':
    asyncio.run(search_dbs())
