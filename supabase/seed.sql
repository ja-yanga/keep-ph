-- Seed file for admin user
-- This creates an admin user in the users_table
-- Note: You'll need to create the auth user separately in Supabase Auth
-- The users_id should match the auth.users.id UUID

-- Insert admin user
-- Replace 'YOUR_ADMIN_AUTH_UUID' with the actual UUID from auth.users after creating the user
-- Replace 'admin@example.com' with your admin email
INSERT INTO public.users_table (
  users_id,
  users_email,
  users_role,
  users_is_verified,
  users_referral_code,
  users_created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Replace with actual auth.users.id UUID
  'admin@example.com', -- Replace with your admin email
  'admin',
  true,
  'ADMIN' || upper(substring(md5(random()::text) from 1 for 6)), -- Generate a unique referral code
  now()
)
ON CONFLICT (users_email) DO UPDATE
SET 
  users_role = EXCLUDED.users_role,
  users_is_verified = EXCLUDED.users_is_verified;

-- Alternative: If you want to create the admin user with a specific UUID
-- First create the user in Supabase Auth dashboard or via API, then use that UUID here
-- Example:
-- INSERT INTO public.users_table (
--   users_id,
--   users_email,
--   users_role,
--   users_is_verified,
--   users_referral_code
-- ) VALUES (
--   'your-auth-user-uuid-here'::uuid,
--   'admin@yourdomain.com',
--   'admin',
--   true,
--   'ADMIN001'
-- )
-- ON CONFLICT (users_email) DO UPDATE
-- SET users_role = EXCLUDED.users_role;

