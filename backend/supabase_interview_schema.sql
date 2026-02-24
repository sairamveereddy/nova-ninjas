-- ============================================================
-- Fix interview tables: drop auth.users FK constraints
-- Our users are in MongoDB, NOT Supabase Auth, so the FK
-- on auth.users(id) rejects every insert. Run this in the
-- Supabase SQL Editor to fix the "Failed to create session" error.
-- ============================================================

-- 1. Drop FK on interview_resumes.user_id
ALTER TABLE interview_resumes
    DROP CONSTRAINT IF EXISTS interview_resumes_user_id_fkey;

-- Make user_id just a plain nullable UUID (no FK)
ALTER TABLE interview_resumes
    ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 2. Drop FK on interview_sessions.user_id
ALTER TABLE interview_sessions
    DROP CONSTRAINT IF EXISTS interview_sessions_user_id_fkey;

ALTER TABLE interview_sessions
    ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

-- 3. Add role_title column if missing
ALTER TABLE interview_sessions
    ADD COLUMN IF NOT EXISTS role_title TEXT;

-- 4. Confirm tables are ready (should return without error)
SELECT 'interview_resumes OK' AS status,
       COUNT(*) AS rows
FROM interview_resumes
UNION ALL
SELECT 'interview_sessions OK',
       COUNT(*)
FROM interview_sessions;
