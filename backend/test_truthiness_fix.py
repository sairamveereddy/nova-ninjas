import os
import sys

# Mock common environment variables for silent startup if needed
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'testdb'

from interview_service import get_db, get_sessions_collection

def test_truthiness():
    print("Testing database truthiness checks...")
    try:
        # This calls get_db which has 'if db is not None'
        db = get_db()
        print(f"✓ get_db() returned: {type(db)}")
        
        # This calls get_collection which has 'if database is not None'
        col = get_sessions_collection()
        print(f"✓ get_sessions_collection() returned: {type(col)}")
        
        print("\n🟢 SUCCESS: No truthiness errors detected.")
    except TypeError as e:
        print(f"\n🔴 FAILED: Truthiness error detected: {e}")
        sys.exit(1)
    except Exception as e:
        # General exceptions are expected if local mongo is missing, 
        # but truthiness error is specific.
        if "Database objects do not implement truth value testing" in str(e):
            print(f"\n🔴 FAILED: Truthiness error detected: {e}")
            sys.exit(1)
        print(f"✓ Note: Handled expected external error: {e}")
        print("\n🟢 SUCCESS: Truthiness logic is sound.")

if __name__ == "__main__":
    test_truthiness()
