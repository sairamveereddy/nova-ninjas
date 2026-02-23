from pymongo import MongoClient
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

# Check jobs created in last 1 hour
one_hour_ago = datetime.utcnow() - timedelta(hours=1)
cursor = db.jobs.find({"createdAt": {"$gte": one_hour_ago}}).sort("createdAt", -1).limit(10)

print(f"Jobs created since {one_hour_ago}:")
count = 0
for job in cursor:
    count += 1
    print(f"Title: {job.get('title')}")
    print(f"Source: {job.get('source')}")
    print(f"Desc Length: {len(job.get('description', ''))}")
    print(f"FullDesc Length: {len(job.get('fullDescription', ''))}")
    print("-" * 20)

if count == 0:
    print("No new jobs found in the last hour.")
else:
    print(f"Found {count} new jobs.")
