import os, asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env')

async def main():
    m = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    dbs = await m.list_database_names()
    print("Databases:", dbs)
    m.close()

if __name__ == "__main__":
    asyncio.run(main())
