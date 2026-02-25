-- Add missing columns to saved_resumes table
-- Run this in the Supabase SQL Editor

-- 1. Add user_email if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='saved_resumes' AND column_name='user_email') THEN
        ALTER TABLE saved_resumes ADD COLUMN user_email TEXT;
    END IF;
END $$;

-- 2. Add file_name if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='saved_resumes' AND column_name='file_name') THEN
        ALTER TABLE saved_resumes ADD COLUMN file_name TEXT;
    END IF;
END $$;

-- 3. Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_saved_resumes_user_email ON saved_resumes(user_email);

-- 4. Set up RLS (Row Level Security) if not already active
-- This assumes public access for now as per previous configurations, but ideally should be authenticated
ALTER TABLE saved_resumes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'saved_resumes' AND policyname = 'Allow public access to saved_resumes'
    ) THEN
        CREATE POLICY "Allow public access to saved_resumes" ON "public"."saved_resumes"
        AS PERMISSIVE FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 6. Add missing columns to profiles table for Google Login
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='google_id') THEN
        ALTER TABLE profiles ADD COLUMN google_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='auth_method') THEN
        ALTER TABLE profiles ADD COLUMN auth_method TEXT;
    END IF;
END $$;

COMMENT ON COLUMN profiles.google_id IS 'External Google sub ID for OAuth users';
COMMENT ON COLUMN profiles.auth_method IS 'Authentication provider (google, email)';

-- 7. Ensure plan has a default and is not null where possible
ALTER TABLE profiles ALTER COLUMN plan SET DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

SELECT 'Resume and Profile schema fixes applied (including plan_expires_at) ✅' AS result;
