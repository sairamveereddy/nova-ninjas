-- SQL Script to add missing profile columns to the profiles table
-- Run this in Supabase SQL Editor

-- Identity & Contact
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone               TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location            TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url        TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url          TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url       TEXT;

-- Professional Data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latest_resume       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_role         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills              JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education           JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience          JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_authorization  JSONB; -- Changed to JSONB for nested structure
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences         JSONB;

-- New: Full Profile JSONB for Orion / Chrome Extension
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_profile        JSONB;

-- Optional: Sensitive/EEO data (if you want to store it in a dedicated column)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sensitive_data     JSONB;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

SELECT 'Profile schema update complete' AS result;
