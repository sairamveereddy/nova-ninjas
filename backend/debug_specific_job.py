from pymongo import MongoClient
import os
from dotenv import load_dotenv
import pprint

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

# Search for Adzuna jobs
print("\n--- ADZUNA JOBS ---")
cursor = db.jobs.find({"source": "adzuna"}).limit(5)
found = False
for job in cursor:
    found = True
    print(f"FOUND JOB: {job.get('_id')}")
    print(f"Company: {job.get('company')}")
    print(f"Title: {job.get('title')}")
    print(f"FullDescription Length: {len(job.get('fullDescription', ''))}")
    print(f"URL: {job.get('url')}")
    print(f"SourceURL: {job.get('sourceUrl')}")
    print("-" * 20)

if not found:
    print("No Adzuna jobs found.")

# Count breakdown
print("\n--- JOB COUNTS BY SOURCE ---")
pipeline = [{"$group": {"_id": "$source", "count": {"$sum": 1}}}]
counts = list(db.jobs.aggregate(pipeline))
for c in counts:
    print(f"{c['_id']}: {c['count']}")
    
# Also check an Ashby job to compare
print("\n--- CHECKING ASHBY JOB ---")
ashby = db.jobs.find_one({"source": "ashby", "fullDescription": {"$regex": "<"}}) # Find one with HTML
if ashby:
    print(f"Ashby Job: {ashby.get('title')}")
    print(f"FullDescription Start: {ashby.get('fullDescription')[:100]}")
else:
    print("No rich Ashby job found yet.")
