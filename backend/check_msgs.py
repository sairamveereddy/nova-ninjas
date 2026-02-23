import os, asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv('.env')
m = AsyncIOMotorClient(os.environ.get('MONGO_URL'), tlsAllowInvalidCertificates=True)
db = m[os.environ.get('DB_NAME','novaninjas')]

async def check():
    c = await db.contact_messages.count_documents({})
    print("contact_messages count in Mongo:", c)
    m.close()

if __name__ == '__main__':
    asyncio.run(check())
