import os, asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from supabase import create_client

load_dotenv('.env')
m = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
db = m[os.environ.get('DB_NAME','novaninjas')]

async def check():
    verified = await db.users.count_documents({'is_verified': True})
    total = await db.users.count_documents({})
    c_21 = await db.users.count_documents({'created_at': {'$exists': True}})
    print('Verified Mongo:', verified, 'Total:', total)

if __name__ == '__main__':
    asyncio.run(check())
