from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

# 1. Delete all Adzuna jobs
result = db.jobs.delete_many({"source": "adzuna"})
print(f"Deleted {result.deleted_count} Adzuna jobs.")

# 2. Delete all JSearch jobs
result = db.jobs.delete_many({"source": "jsearch"})
print(f"Deleted {result.deleted_count} JSearch jobs.")

# 3. Delete any job with very short description (unless it is Ashby which we know we fixed)
# We trust Ashby jobs now because of the fix, but let's be safe.
# Actually, let's just count them first.
short_desc_count = db.jobs.count_documents({
    "$expr": {"$lt": [{"$strLenCP": {"$ifNull": ["$description", ""]}}, 200]},
    "source": {"$nin": ["adzuna", "jsearch"]} # Exclude ones we just deleted
})
print(f"Remaining jobs with short descriptions: {short_desc_count}")

# 4. Verify Raytheon is gone
ray_count = db.jobs.count_documents({"company": {"$regex": "Raytheon", "$options": "i"}})
print(f"Raytheon jobs remaining: {ray_count}")
