-- Create DB-BACKUPS storage bucket for database backups
-- This bucket is private and only accessible by admins and service role
-- Used by GitHub Actions workflows to store automated database backups

-- Create DB-BACKUPS bucket as PRIVATE (public = false)
-- Using idempotent approach: check if bucket exists first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'DB-BACKUPS'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('DB-BACKUPS', 'DB-BACKUPS', false);
  ELSE
    -- Update existing bucket to ensure it's private
    UPDATE storage.buckets 
    SET public = false 
    WHERE id = 'DB-BACKUPS';
  END IF;
END $$;

-- Policy: Only admins can access DB-BACKUPS bucket
-- Service role (used by GitHub Actions) bypasses RLS, so it can always access
DROP POLICY IF EXISTS db_backups_policy ON storage.objects;
CREATE POLICY db_backups_policy
ON storage.objects
FOR ALL
USING (
  bucket_id = 'DB-BACKUPS'
  AND EXISTS (
    SELECT 1 
    FROM public.users_table 
    WHERE users_id = auth.uid() 
    AND users_role = 'admin'
  )
);

-- Note: Service role (used by GitHub Actions with SUPABASE_SERVICE_ROLE_KEY)
-- bypasses Row Level Security, so it can upload/download backups without
-- needing to be an admin user. Regular authenticated users cannot access
-- this bucket unless they are admins.

