-- Create storage buckets for package photos and other mailroom-related files
-- This migration creates all necessary storage buckets that are referenced in the application

-- Create PACKAGES-PHOTO bucket for package photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('PACKAGES-PHOTO', 'PACKAGES-PHOTO', true)
ON CONFLICT (id) DO NOTHING;

-- Create MAILROOM-SCANS bucket for scanned documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('MAILROOM-SCANS', 'MAILROOM-SCANS', true)
ON CONFLICT (id) DO NOTHING;

-- Create MAILROOM-PROOFS bucket for release proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('MAILROOM-PROOFS', 'MAILROOM-PROOFS', true)
ON CONFLICT (id) DO NOTHING;

-- Create REWARD-PROOFS bucket for reward claim proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('REWARD-PROOFS', 'REWARD-PROOFS', true)
ON CONFLICT (id) DO NOTHING;

-- Create AVATARS bucket for user avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('AVATARS', 'AVATARS', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for PACKAGES-PHOTO bucket
-- Allow authenticated users and admins to upload/read files
-- Files are organized by user_id folder: {user_id}/{filename}
DROP POLICY IF EXISTS packages_photo_policy ON storage.objects;
CREATE POLICY packages_photo_policy
ON storage.objects
FOR ALL
USING (
  bucket_id = 'PACKAGES-PHOTO' 
  AND (
    owner = auth.uid() 
    OR split_part(name, '/', 1) = auth.uid()::text
    OR EXISTS (
      SELECT 1 
      FROM public.users_table 
      WHERE users_id = auth.uid() 
      AND users_role = 'admin'
    )
  )
);

-- Note: Policies for other buckets (MAILROOM-SCANS, MAILROOM-PROOFS, REWARD-PROOFS, AVATARS)
-- are already created in migration 20251217000005_add_policies.sql

