from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

count = db.jobs.count_documents({"source": "usajobs"})
print(f"USAJobs count: {count}")

# Check description length for USAJobs
cursor = db.jobs.find({"source": "usajobs"}).limit(5)
for job in cursor:
    print(f"USAJob: {job.get('title')} ({len(job.get('description', ''))} chars)")
