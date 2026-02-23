from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

print("--- ASHBY JOB ---")
ashby_job = db.jobs.find_one({"source": "ashby"})
if ashby_job:
    print(f"Title: {ashby_job.get('title')}")
    print(f"Desc: {ashby_job.get('description')}")
    print(f"FullDesc: {ashby_job.get('fullDescription')}")
else:
    print("No Ashby jobs found.")

print("\n--- ADZUNA JOB ---")
adzuna_job = db.jobs.find_one({"source": "Adzuna"})
if adzuna_job:
    print(f"Title: {adzuna_job.get('title')}")
    print(f"Desc: {adzuna_job.get('description')[:200]}...")
    print(f"FullDesc: {adzuna_job.get('fullDescription')}")
else:
    print("No Adzuna jobs found.")
