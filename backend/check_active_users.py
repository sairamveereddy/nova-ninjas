import os, asyncio
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env')
sb = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))

profs = sb.table('profiles').select('id, email, created_at, plan, is_verified').execute().data
apps = sb.table('applications').select('user_id').execute().data
scans = sb.table('scans').select('user_email').execute().data
resumes = sb.table('saved_resumes').select('user_id').execute().data

active_ids = set([a['user_id'] for a in apps if a.get('user_id')] + [r['user_id'] for r in resumes if r.get('user_id')])
active_emails = set([s['user_email'] for s in scans if s.get('user_email')] + [p['email'] for p in profs if p['id'] in active_ids])

count = 0
for p in profs:
    # A user is active if they have any data OR if they were created before 2026 OR if they are verified.
    # We just want to count active users to see if it matches 21.
    if p['email'] in active_emails or p['is_verified']:
        count += 1

print(f'Active users with data or verified: {count} out of {len(profs)} Total profiles')

recent = sum(1 for p in profs if p.get('created_at', '').startswith('2026-02-21'))
print(f'Profiles created today: {recent}')
