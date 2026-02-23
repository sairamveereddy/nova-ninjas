
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def inspect_doc(email):
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    user = await db.users.find_one({"email": email})
    print(f"User email: {user.get('email')}")
    print(f"User id: '{user.get('id')}' type: {type(user.get('id'))}")
    
    # Try the exact query used in server.py
    query = {"$or": [{"userEmail": email}, {"userId": user.get('id')}]}
    print(f"Query: {query}")
    
    doc = await db.saved_resumes.find_one(query)
    if doc:
        print("FOUND DOC in saved_resumes!")
        print(f"Doc keys: {doc.keys()}")
        print(f"userId value: '{doc.get('userId')}' type: {type(doc.get('userId'))}")
        print(f"jobTitle: {doc.get('jobTitle')}")
    else:
        print("NOT FOUND with query.")
        # Try finding ANY doc with this email to see what's wrong
        doc2 = await db.saved_resumes.find_one({"userEmail": email})
        if doc2:
            print("FOUND with email only!")
            print(f"userId in doc: '{doc2.get('userId')}'")
            print(f"userId type: {type(doc2.get('userId'))}")

if __name__ == "__main__":
    asyncio.run(inspect_doc("srkreddy452@gmail.com"))
