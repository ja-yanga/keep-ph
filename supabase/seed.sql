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

-- ============================================================================
-- Seed Mailroom Plans
-- ============================================================================
-- Insert default mailroom plans that users can select from
-- Only insert if no plans exist yet
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mailroom_plan_table LIMIT 1) THEN
    INSERT INTO public.mailroom_plan_table (
      mailroom_plan_name,
      mailroom_plan_price,
      mailroom_plan_description,
      mailroom_plan_storage_limit,
      mailroom_plan_can_receive_mail,
      mailroom_plan_can_receive_parcels,
      mailroom_plan_can_digitize
    ) VALUES
      (
        'Basic Plan',
        500.00,
        'Perfect for individuals who receive occasional mail. Includes basic mail storage and digitization.',
        10, -- 10 items storage limit
        true,
        false,
        true
      ),
      (
        'Standard Plan',
        1000.00,
        'Ideal for regular mail recipients. Includes mail and small parcel storage with full digitization.',
        25, -- 25 items storage limit
        true,
        true,
        true
      ),
      (
        'Premium Plan',
        2000.00,
        'Best for businesses and frequent mail recipients. Unlimited storage, parcels, and priority digitization.',
        NULL, -- Unlimited storage (NULL means unlimited)
        true,
        true,
        true
      );
  END IF;
END $$;

-- ============================================================================
-- Seed Mailroom Locations (Optional - add if you want default locations)
-- ============================================================================
-- Uncomment and modify if you want to seed default locations
/*
INSERT INTO public.mailroom_location_table (
  mailroom_location_name,
  mailroom_location_region,
  mailroom_location_city,
  mailroom_location_barangay,
  mailroom_location_zip,
  mailroom_location_total_lockers,
  mailroom_location_prefix
) VALUES
  (
    'Manila Central Hub',
    'Metro Manila',
    'Manila',
    'Ermita',
    '1000',
    100,
    'MNL'
  ),
  (
    'Makati Business District',
    'Metro Manila',
    'Makati',
    'Bel-Air',
    '1209',
    50,
    'MKT'
  )
ON CONFLICT DO NOTHING;
*/

