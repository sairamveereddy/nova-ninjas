import os, asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
sb = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))

users = sb.auth.admin.list_users()

today_users = []
older_users = []

for u in users:
    # u.created_at is a datetime object
    if u.created_at.year == 2026 and u.created_at.month == 2 and u.created_at.day == 21:
        today_users.append(u)
    else:
        older_users.append(u)

print(f"Users created today (Migrated): {len(today_users)}")
print(f"Users created before today (Originals): {len(older_users)}")

# Wait, if exactly 21 older users exist, I will delete the today_users!
if len(older_users) == 21 or len(older_users) == 22: # (including admin)
    print("Found the 21 users!")
else:
    print("Counts don't match exactly 21. Found", len(older_users))
