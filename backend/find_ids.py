
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
from dotenv import load_dotenv

load_dotenv()

async def find_all_user_data(email):
    mongo_url = os.getenv("MONGO_URL")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.getenv("DB_NAME", "novaninjas")]
    
    user = await db.users.find_one({"email": email})
    if not user:
        print("User not found")
        return
        
    u_id = user.get("id")
    u_oid = str(user.get("_id"))
    
    print(f"User Email: {email}")
    print(f"User 'id': {u_id}")
    print(f"User '_id': {u_oid}")
    
    # Check Collections
    collections = ["profiles", "saved_resumes", "resumes", "scans"]
    for coll in collections:
        print(f"\nSearching '{coll}':")
        # Search by email, id, or _id in any field that looks like a user link
        docs = await db[coll].find({
            "$or": [
                {"userEmail": email},
                {"userId": u_id},
                {"userId": u_oid},
                {"user_id": u_id},
                {"user_id": u_oid}
            ]
        }).to_list(length=10)
        
        print(f"Found {len(docs)} docs")
        for d in docs:
            print(f"- ID: {d.get('_id')}")
            # Identify which field matched
            for k, v in d.items():
                if v in [email, u_id, u_oid]:
                    print(f"  MATCH on '{k}': {v}")
            # Print role info if present
            for role_field in ["target_role", "jobTitle", "role", "title"]:
                if d.get(role_field):
                    print(f"  {role_field}: {d.get(role_field)}")

if __name__ == "__main__":
    asyncio.run(find_all_user_data("srkreddy452@gmail.com"))
