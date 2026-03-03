-- ================================================================
-- Fix Applications Schema & Sync with Backend Expectations
-- ================================================================

-- 1. Ensure applications table has all required columns
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_title  TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company    TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS job_url    TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS metadata   JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS notes      TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS platform   TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- 2. Create index for email lookup if missing
CREATE INDEX IF NOT EXISTS applications_email_idx ON applications(user_email);

-- 3. Create placeholder jobs table to satisfy existing joins if needed
CREATE TABLE IF NOT EXISTS jobs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT,
    company     TEXT,
    location    TEXT,
    description TEXT,
    url         TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    metadata    JSONB
);

-- 4. Data Migration: Try to fill user_email from profile link if possible
-- Only works if user_id is already linked
UPDATE applications a
SET user_email = p.email
FROM profiles p
WHERE a.user_id = p.id
AND a.user_email IS NULL;

-- 5. Data Migration: Try to fill company from platform column for older rows
UPDATE applications
SET company = platform
WHERE company IS NULL AND platform IS NOT NULL;

SELECT 'Applications schema and data fix complete ✅' AS result;
