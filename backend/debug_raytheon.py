from pymongo import MongoClient
import os
from dotenv import load_dotenv
import pprint

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

# Find Raytheon job
job = db.jobs.find_one({"company": {"$regex": "Raytheon", "$options": "i"}})

if job:
    print(f"Source: {job.get('source')}")
    print(f"Title: {job.get('title')}")
    print("-" * 20)
    print("Description Snippet:")
    print(job.get('description')[:200])
    print("-" * 20)
    print("Full Description Snippet:")
    print(job.get('fullDescription')[:200])
else:
    print("Raytheon job not found.")
