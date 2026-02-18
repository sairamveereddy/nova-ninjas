from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "novaninjas")

def inspect_job():
    print(f"Connecting to MongoDB...")
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client[DB_NAME]
        
        # Test connection
        client.server_info()
        print("Connected!")
        
        # Try to find the Logos job
        job = db.jobs.find_one({"company": "Logos"})
        
        if job:
            print("\n--- JOB FOUND ---")
            print(f"Title: {job.get('title')}")
            print(f"Company: {job.get('company')}")
            desc = job.get('description', '')
            print(f"Description Length: {len(desc)}")
            print(f"Description Preview: {desc[:100]}...")
            
            print(f"\nResponsibilities: {job.get('responsibilities', 'N/A')}")
            print(f"Qualifications: {job.get('qualifications', 'N/A')}")
            print(f"Full Description: {job.get('fullDescription', None)}")
            if job.get('fullDescription') is None:
                 print("\n!!! job.fullDescription IS MISSING/NULL in DB !!!")
            elif len(job.get('fullDescription')) == 0:
                 print("\n!!! job.fullDescription IS EMPTY STRING in DB !!!")
        else:
            print("Job 'Logos' not found. Listing most recent 20 jobs:")
            cursor = db.jobs.find().sort("_id", -1).limit(20)
            for j in cursor:
                # Print ID so I can copy it if needed
                print(f"- [{j.get('_id')}] {j.get('company')}: {j.get('title')}")
                if "Logos" in j.get('company', ''):
                     print(f"  ^^^ FOUND IT! Description len: {len(j.get('description', ''))}")
                     print(f"  ^^^ Header preview: {j.get('description', '')[:50]}")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_job()
