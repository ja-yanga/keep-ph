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
-- Seed Mailroom Locations
-- ============================================================================
-- Insert default mailroom locations that users can select from
-- Only insert if no locations exist yet
DO $$
DECLARE
  loc1_id UUID;
  loc2_id UUID;
  loc3_id UUID;
  loc4_id UUID;
  loc5_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.mailroom_location_table LIMIT 1) THEN
    -- Insert locations and get their IDs
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
        50,
        'MNL'
      )
    RETURNING mailroom_location_id INTO loc1_id;

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
        'Makati Business District',
        'Metro Manila',
        'Makati',
        'Bel-Air',
        '1209',
        30,
        'MKT'
      )
    RETURNING mailroom_location_id INTO loc2_id;

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
        'Quezon City Main Branch',
        'Metro Manila',
        'Quezon City',
        'Diliman',
        '1101',
        40,
        'QC'
      )
    RETURNING mailroom_location_id INTO loc3_id;

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
        'BGC Taguig Hub',
        'Metro Manila',
        'Taguig',
        'Fort Bonifacio',
        '1630',
        35,
        'BGC'
      )
    RETURNING mailroom_location_id INTO loc4_id;

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
        'Ortigas Center',
        'Metro Manila',
        'Pasig',
        'Ortigas Center',
        '1605',
        25,
        'ORT'
      )
    RETURNING mailroom_location_id INTO loc5_id;

    -- Create lockers for Manila Central Hub (50 lockers: A-001 to A-050)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT loc1_id, 'A-' || LPAD(series::text, 3, '0'), true
    FROM generate_series(1, 50) AS series;

    -- Create lockers for Makati Business District (30 lockers: B-001 to B-030)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT loc2_id, 'B-' || LPAD(series::text, 3, '0'), true
    FROM generate_series(1, 30) AS series;

    -- Create lockers for Quezon City Main Branch (40 lockers: C-001 to C-040)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT loc3_id, 'C-' || LPAD(series::text, 3, '0'), true
    FROM generate_series(1, 40) AS series;

    -- Create lockers for BGC Taguig Hub (35 lockers: D-001 to D-035)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT loc4_id, 'D-' || LPAD(series::text, 3, '0'), true
    FROM generate_series(1, 35) AS series;

    -- Create lockers for Ortigas Center (25 lockers: E-001 to E-025)
    INSERT INTO public.location_locker_table (
      mailroom_location_id,
      location_locker_code,
      location_locker_is_available
    )
    SELECT loc5_id, 'E-' || LPAD(series::text, 3, '0'), true
    FROM generate_series(1, 25) AS series;

  END IF;
END $$;

