from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://novaninjas:auF8nRrqAorEwN5v@cluster0.lb7o5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = MongoClient(MONGO_URL)
db = client["nova-ninjas"]

total = db.jobs.count_documents({"source": "ashby"})
enriched = 0
not_enriched = 0

cursor = db.jobs.find({"source": "ashby"})
for job in cursor:
    desc = job.get("fullDescription", "")
    if len(desc) > 300 and "Apply at" not in desc[:20]:
        enriched += 1
    else:
        not_enriched += 1

print(f"Total Ashby: {total}")
print(f"Enriched (HTML): {enriched}")
print(f"Not Enriched (Link): {not_enriched}")
