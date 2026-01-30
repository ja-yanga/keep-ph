-- ============================================================================
-- Large Scale Seed Data for Testing
-- ============================================================================
-- This script generates 50,000+ records per table for testing purposes
-- Focus: Users, Actions/Queues (Mail Action Requests), Mailbox Items, etc.
-- Location tables are excluded as only few locations are company-owned
-- 
-- USAGE:
-- 1. **REQUIRED**: Run seed.sql FIRST to create plans, locations, and admin users
-- 2. Then run this script (seed_large_data.sql) to generate test data
-- 3. This script can be run multiple times (idempotent - clears and regenerates)
-- 4. Estimated execution time: 5-10 minutes depending on database capacity
--
-- IMPORTANT: If you get "null value in column mailroom_plan_id" error:
--   → You need to run seed.sql FIRST before running this script!
--
-- SPECIFIC USERS CREATED:
-- - Admin users: admin@example.com, admin1@example.com (password: admin123)
-- - Test users: user1@example.com, user2@example.com, user3@example.com (password: customer123)
-- - Plus 50,000 generated test users (user1@test.keep-ph.com through user50000@test.keep-ph.com)
--
-- TABLES SEEDED:
-- - users_table: 50,000 users
-- - user_address_table: ~45,000 addresses (90% of users)
-- - user_kyc_table: All users have verified KYC records (100%)
-- - mailroom_registration_table: ~40,000 registrations (80% of users)
-- - subscription_table: ~40,000 subscriptions (one per registration)
-- - payment_transaction_table: ~120,000 transactions (multiple per registration)
-- - mailroom_assigned_locker_table: ~30,000 assigned lockers (for registrations with locations)
-- - mailbox_item_table: 50,000+ mailbox items
-- - mailroom_file_table: 60,000+ files (scanned documents, package photos)
-- - mail_action_request_table: 60,000+ action requests (THE QUEUES)
-- - notification_table: 75,000+ notifications
-- - referral_table: ~15,000 referrals
-- - rewards_claim_table: ~5,000 reward claims
-- - activity_log_table: 150,000+ activity logs (linked to actual entities)
-- 
-- NOTE: All tables properly reference users or admins through foreign keys
-- ============================================================================

-- Disable triggers temporarily for faster inserts
SET session_replication_role = 'replica';

-- Clear existing test data (but keep admin user, plans, and locations)
BEGIN;

-- Delete in reverse order of dependencies
DELETE FROM activity_log_table WHERE user_id NOT IN (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com'));
DELETE FROM error_log_table WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com'));
DELETE FROM rewards_claim_table WHERE user_id NOT IN (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com'));
DELETE FROM referral_table WHERE referral_referrer_user_id IS NOT NULL AND referral_referrer_user_id NOT IN (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com'));
DELETE FROM notification_table WHERE user_id NOT IN (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com'));
DELETE FROM mailroom_file_table;
DELETE FROM mail_action_request_table;
DELETE FROM mailbox_item_table;
DELETE FROM mailroom_assigned_locker_table;
DELETE FROM payment_transaction_table;
DELETE FROM subscription_table;
DELETE FROM mailroom_registration_table;
DELETE FROM user_kyc_address_table;
DELETE FROM user_kyc_table;
DELETE FROM user_address_table;
DELETE FROM users_table WHERE users_email NOT IN ('admin@example.com', 'admin1@example.com', 'user1@example.com', 'user2@example.com', 'user3@example.com');

-- Create specific test users (user1, user2, user3) in auth.users with password 'customer123'
DO $$
BEGIN
  -- Create user1@example.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user1@example.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'user1@example.com',
      crypt('customer123', gen_salt('bf')),
      current_timestamp,
      current_timestamp,
      current_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{"role":"user"}',
      current_timestamp,
      current_timestamp,
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Create user2@example.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user2@example.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'user2@example.com',
      crypt('customer123', gen_salt('bf')),
      current_timestamp,
      current_timestamp,
      current_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{"role":"user"}',
      current_timestamp,
      current_timestamp,
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Create user3@example.com
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user3@example.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'user3@example.com',
      crypt('customer123', gen_salt('bf')),
      current_timestamp,
      current_timestamp,
      current_timestamp,
      '{"provider":"email","providers":["email"]}',
      '{"role":"user"}',
      current_timestamp,
      current_timestamp,
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Create identity records for test users
INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    id as provider_id,
    format('{"sub":"%s","email":"%s"}', id::text, email)::jsonb,
    'email',
    current_timestamp,
    current_timestamp,
    current_timestamp
FROM auth.users
WHERE email IN ('user1@example.com', 'user2@example.com', 'user3@example.com')
  AND NOT EXISTS (
      SELECT 1 FROM auth.identities WHERE user_id = auth.users.id
  );

-- Create users_table entries for test users (if trigger didn't create them)
INSERT INTO public.users_table (
    users_id,
    users_email,
    users_role,
    users_is_verified,
    users_referral_code
)
SELECT 
    id,
    email,
    'user',
    true,
    'USER' || upper(substring(md5(random()::text) from 1 for 6))
FROM auth.users
WHERE email IN ('user1@example.com', 'user2@example.com', 'user3@example.com')
  AND NOT EXISTS (
      SELECT 1 FROM public.users_table WHERE users_id = auth.users.id
  );

-- Update users_table to ensure test users are verified
UPDATE public.users_table
SET users_is_verified = true
WHERE users_email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');

-- Generate 50,000 Users (excluding the specific test users)
INSERT INTO users_table (
  users_id,
  users_email,
  users_role,
  users_created_at,
  users_is_verified,
  users_referral_code,
  mobile_number,
  referral_reward_milestone_claimed
)
SELECT 
  gen_random_uuid(),
  'user' || generate_series || '@test.keep-ph.com',
  'user', -- All generated users are regular users (admins are created separately)
  now() - (random() * interval '365 days'),
  true, -- All users are verified (they all have verified KYC)
  'REF' || upper(substring(md5(random()::text) from 1 for 8)),
  '+639' || LPAD((floor(random() * 999999999)::bigint)::text, 9, '0'),
  CASE WHEN random() < 0.20 THEN floor(random() * 5)::int ELSE 0 END
FROM generate_series(1, 50000);

-- Store user IDs for reference (includes specific test users and generated users)
CREATE TEMP TABLE IF NOT EXISTS temp_user_ids AS
SELECT users_id, users_email, users_created_at
FROM users_table
WHERE users_email LIKE '%@test.keep-ph.com' 
   OR users_email IN ('user1@example.com', 'user2@example.com', 'user3@example.com')
ORDER BY users_created_at;

-- Generate User Addresses (~45,000 - 90% of users)
INSERT INTO user_address_table (
  user_id,
  user_address_label,
  user_address_line1,
  user_address_line2,
  user_address_city,
  user_address_region,
  user_address_postal,
  user_address_is_default,
  user_address_created_at
)
SELECT 
  u.users_id,
  CASE floor(random() * 4)
    WHEN 0 THEN 'Home'
    WHEN 1 THEN 'Office'
    WHEN 2 THEN 'Business'
    ELSE 'Other'
  END,
  floor(random() * 9999)::text || ' ' || 
  (ARRAY['Main Street', 'Oak Avenue', 'Maple Drive', 'Park Boulevard', 'River Road', 'Hill Street', 'Valley Lane', 'Sunset Boulevard'])[floor(random() * 8 + 1)],
  CASE WHEN random() < 0.50 THEN 'Unit ' || floor(random() * 500)::text ELSE NULL END,
  (ARRAY['Manila', 'Makati', 'Quezon City', 'Taguig', 'Pasig', 'Mandaluyong', 'San Juan', 'Marikina', 'Las Pinas', 'Paranaque'])[floor(random() * 10 + 1)],
  (ARRAY['Metro Manila', 'Calabarzon', 'Central Luzon'])[floor(random() * 3 + 1)],
  LPAD((1000 + floor(random() * 8000))::text, 4, '0'),
  row_number() OVER (PARTITION BY u.users_id) = 1, -- First address is default
  u.users_created_at + (random() * interval '30 days')
FROM temp_user_ids u
WHERE random() < 0.90; -- 90% of users have addresses

-- Generate User KYC (All users - 100% verified)
INSERT INTO user_kyc_table (
  user_id,
  user_kyc_status,
  user_kyc_id_front_url,
  user_kyc_id_back_url,
  user_kyc_submitted_at,
  user_kyc_verified_at,
  user_kyc_id_document_type,
  user_kyc_first_name,
  user_kyc_last_name,
  user_kyc_date_of_birth,
  user_kyc_agreements_accepted
)
SELECT 
  u.users_id,
  'VERIFIED'::user_kyc_status, -- All users have verified KYC
  'https://storage.keep-ph.com/kyc/front_' || u.users_id::text || '.jpg',
  'https://storage.keep-ph.com/kyc/back_' || u.users_id::text || '.jpg',
  u.users_created_at + (random() * interval '30 days'), -- Submitted within 30 days of account creation
  u.users_created_at + (random() * interval '45 days'), -- Verified within 45 days (after submission)
  (ARRAY['PASSPORT', 'DRIVERS_LICENSE', 'PHILHEALTH_ID', 'SSS_ID', 'TIN_ID', 'NATIONAL_ID'])[floor(random() * 6 + 1)],
  (ARRAY['Juan', 'Maria', 'Jose', 'Anna', 'Carlos', 'Maria', 'Pedro', 'Liza', 'Miguel', 'Carmen'])[floor(random() * 10 + 1)],
  (ARRAY['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Ramos', 'Torres', 'Flores', 'Villanueva', 'Cruz', 'Lopez'])[floor(random() * 10 + 1)],
  (DATE '1950-01-01' + (random() * (DATE '2005-12-31' - DATE '1950-01-01'))::int),
  true -- All agreements accepted
FROM temp_user_ids u;

-- Update all users to be verified since they all have verified KYC
UPDATE users_table
SET users_is_verified = true
WHERE users_id IN (SELECT users_id FROM temp_user_ids);

-- Get existing plans (from seed.sql)
CREATE TEMP TABLE IF NOT EXISTS temp_plan_ids AS
SELECT mailroom_plan_id, mailroom_plan_name
FROM mailroom_plan_table;

-- Verify that plans exist (required dependency from seed.sql)
-- This prevents NULL constraint violations if seed.sql wasn't run first
DO $$
DECLARE
  plan_count INT;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM temp_plan_ids;
  IF plan_count = 0 THEN
    RAISE EXCEPTION 'ERROR: No mailroom plans found in mailroom_plan_table! 

REQUIRED: You must run seed.sql FIRST before running seed_large_data.sql.

The seed.sql file creates:
- Admin users
- Mailroom plans (required for registrations)
- Mailroom locations
- Lockers

Please run: supabase/seed.sql first, then run: supabase/seed_large_data.sql';
  END IF;
END $$;

-- Get existing locations (from seed.sql) - limited as user specified
CREATE TEMP TABLE IF NOT EXISTS temp_location_ids AS
SELECT mailroom_location_id
FROM mailroom_location_table;

-- Generate Mailroom Registrations (~40,000 - 80% of users)
INSERT INTO mailroom_registration_table (
  mailroom_registration_id,
  user_id,
  mailroom_location_id,
  mailroom_plan_id,
  mailroom_registration_code,
  mailroom_registration_status,
  mailroom_registration_created_at,
  mailroom_registration_updated_at
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  CASE WHEN random() < 0.80 THEN (SELECT mailroom_location_id FROM temp_location_ids ORDER BY random() LIMIT 1) ELSE NULL END,
  (SELECT mailroom_plan_id FROM temp_plan_ids ORDER BY random() LIMIT 1), -- Will never be NULL due to check above
  'REG-' || upper(substring(md5(random()::text || u.users_id::text) from 1 for 12)),
  random() < 0.90, -- 90% active
  u.users_created_at + (random() * interval '180 days'),
  u.users_created_at + (random() * interval '200 days')
FROM temp_user_ids u
WHERE random() < 0.80; -- 80% of users register

-- Store registration IDs for reference
CREATE TEMP TABLE IF NOT EXISTS temp_registration_ids AS
SELECT 
  mr.mailroom_registration_id,
  mr.user_id,
  mr.mailroom_location_id,
  mr.mailroom_registration_created_at,
  mr.mailroom_registration_code
FROM mailroom_registration_table mr
INNER JOIN temp_user_ids u ON mr.user_id = u.users_id;

-- Generate Subscriptions (one per registration)
INSERT INTO subscription_table (
  subscription_id,
  mailroom_registration_id,
  subscription_billing_cycle,
  subscription_auto_renew,
  subscription_started_at,
  subscription_expires_at,
  subscription_created_at,
  subscription_updated_at
)
SELECT 
  gen_random_uuid(),
  r.mailroom_registration_id,
  CASE floor(random() * 3)
    WHEN 0 THEN 'MONTHLY'::billing_cycle
    WHEN 1 THEN 'QUARTERLY'::billing_cycle
    ELSE 'ANNUAL'::billing_cycle
  END,
  random() < 0.70, -- 70% auto-renew
  r.mailroom_registration_created_at,
  r.mailroom_registration_created_at + 
    CASE floor(random() * 3)
      WHEN 0 THEN interval '1 month'
      WHEN 1 THEN interval '3 months'
      ELSE interval '1 year'
    END,
  r.mailroom_registration_created_at,
  r.mailroom_registration_created_at + (random() * interval '30 days')
FROM temp_registration_ids r;

-- Generate Payment Transactions (~120,000 - multiple per registration)
INSERT INTO payment_transaction_table (
  payment_transaction_id,
  mailroom_registration_id,
  payment_transaction_amount,
  payment_transaction_status,
  payment_transaction_date,
  payment_transaction_method,
  payment_transaction_type,
  payment_transaction_reference_id,
  payment_transaction_channel,
  payment_transaction_reference,
  payment_transaction_order_id,
  payment_transaction_created_at,
  payment_transaction_updated_at
)
SELECT 
  gen_random_uuid(),
  r.mailroom_registration_id,
  CASE floor(random() * 3)
    WHEN 0 THEN 500.00
    WHEN 1 THEN 1000.00
    ELSE 2000.00
  END,
  CASE 
    WHEN random() < 0.70 THEN 'PAID'::payment_status
    WHEN random() < 0.85 THEN 'PROCESSING'::payment_status
    WHEN random() < 0.95 THEN 'PENDING'::payment_status
    WHEN random() < 0.98 THEN 'FAILED'::payment_status
    ELSE 'REFUNDED'::payment_status
  END,
  r.mailroom_registration_created_at + (random() * interval '365 days'),
  (ARRAY['credit_card', 'debit_card', 'gcash', 'paymaya', 'bank_transfer', 'paypal'])[floor(random() * 6 + 1)],
  CASE 
    WHEN random() < 0.80 THEN 'SUBSCRIPTION'::payment_type
    WHEN random() < 0.95 THEN 'ONE_TIME'::payment_type
    ELSE 'REFUND'::payment_type
  END,
  'REF-' || upper(substring(md5(random()::text || r.mailroom_registration_id::text) from 1 for 16)),
  (ARRAY['paymongo', 'xendit', 'paypal', 'dragonpay'])[floor(random() * 4 + 1)],
  'TXN-' || upper(substring(md5(random()::text) from 1 for 20)),
  'ORD-' || upper(substring(md5(random()::text) from 1 for 12)),
  r.mailroom_registration_created_at + (random() * interval '365 days'),
  r.mailroom_registration_created_at + (random() * interval '370 days')
FROM temp_registration_ids r
CROSS JOIN generate_series(1, CASE WHEN random() < 0.5 THEN 2 WHEN random() < 0.8 THEN 3 ELSE 4 END); -- 2-4 transactions per registration

-- Limit to approximately 120,000 transactions
-- (Already controlled by registration count and per-registration multiplier)

-- Get lockers for assignments (limited)
CREATE TEMP TABLE IF NOT EXISTS temp_locker_ids AS
SELECT location_locker_id, mailroom_location_id
FROM location_locker_table
WHERE location_locker_is_available = true;

-- Generate Mailroom Assigned Lockers (~30,000 - for registrations with locations)
-- Each registration with a location gets assigned a locker
-- Use a deterministic approach to ensure no duplicate locker assignments
WITH registrations_with_locations AS (
  SELECT 
    r.mailroom_registration_id,
    r.mailroom_location_id,
    r.mailroom_registration_created_at,
    ROW_NUMBER() OVER (PARTITION BY r.mailroom_location_id ORDER BY r.mailroom_registration_created_at, r.mailroom_registration_id) as reg_row_num
  FROM temp_registration_ids r
  WHERE r.mailroom_location_id IS NOT NULL
    AND random() < 0.75  -- 75% of registrations with locations get assigned lockers
),
available_lockers_by_location AS (
  SELECT 
    l.location_locker_id,
    l.mailroom_location_id,
    ROW_NUMBER() OVER (PARTITION BY l.mailroom_location_id ORDER BY l.location_locker_id) as locker_row_num
  FROM temp_locker_ids l
  WHERE l.location_locker_id NOT IN (
    SELECT location_locker_id 
    FROM mailroom_assigned_locker_table
    WHERE location_locker_id IS NOT NULL
  )
)
INSERT INTO mailroom_assigned_locker_table (
  mailroom_assigned_locker_id,
  mailroom_registration_id,
  location_locker_id,
  mailroom_assigned_locker_assigned_at,
  mailroom_assigned_locker_status
)
SELECT 
  gen_random_uuid(),
  r.mailroom_registration_id,
  l.location_locker_id,
  r.mailroom_registration_created_at + (random() * interval '7 days'),
  CASE 
    WHEN random() < 0.30 THEN 'Empty'::mailroom_assigned_locker_status
    WHEN random() < 0.70 THEN 'Normal'::mailroom_assigned_locker_status
    WHEN random() < 0.90 THEN 'Near Full'::mailroom_assigned_locker_status
    ELSE 'Full'::mailroom_assigned_locker_status
  END
FROM registrations_with_locations r
INNER JOIN available_lockers_by_location l 
  ON r.mailroom_location_id = l.mailroom_location_id 
  AND r.reg_row_num = l.locker_row_num
WHERE l.location_locker_id IS NOT NULL
LIMIT 30000; -- Limit to 30,000 assignments (or available lockers, whichever is less)

-- Generate Mailbox Items (50,000+ - packages/mail received)
INSERT INTO mailbox_item_table (
  mailbox_item_id,
  mailroom_registration_id,
  mailbox_item_type,
  mailbox_item_status,
  mailbox_item_received_at,
  location_locker_id,
  mailbox_item_release_address,
  user_address_id,
  mailbox_item_name,
  mailbox_item_photo,
  mailbox_item_created_at,
  mailbox_item_updated_at
)
SELECT 
  gen_random_uuid(),
  r.mailroom_registration_id,
  CASE WHEN random() < 0.60 THEN 'Document'::mailroom_package_type ELSE 'Parcel'::mailroom_package_type END,
  CASE 
    WHEN random() < 0.40 THEN 'STORED'::mailroom_package_status
    WHEN random() < 0.60 THEN 'RELEASED'::mailroom_package_status
    WHEN random() < 0.70 THEN 'RETRIEVED'::mailroom_package_status
    WHEN random() < 0.80 THEN 'REQUEST_TO_SCAN'::mailroom_package_status
    WHEN random() < 0.90 THEN 'REQUEST_TO_RELEASE'::mailroom_package_status
    WHEN random() < 0.95 THEN 'REQUEST_TO_DISPOSE'::mailroom_package_status
    ELSE 'DISPOSED'::mailroom_package_status
  END,
  r.mailroom_registration_created_at + (random() * interval '365 days'),
  CASE 
    WHEN r.mailroom_location_id IS NOT NULL AND random() < 0.70 
    THEN (SELECT location_locker_id FROM temp_locker_ids WHERE mailroom_location_id = r.mailroom_location_id ORDER BY random() LIMIT 1)
    ELSE NULL
  END,
  CASE WHEN random() < 0.30 THEN '123 Forward Street, Metro Manila, 1000' ELSE NULL END,
  CASE WHEN random() < 0.60 THEN (SELECT user_address_id FROM user_address_table WHERE user_id = r.user_id ORDER BY random() LIMIT 1) ELSE NULL END,
  CASE 
    WHEN random() < 0.60 THEN 'Package ' || floor(random() * 10000)::text
    ELSE 'Document ' || floor(random() * 10000)::text
  END,
  CASE WHEN random() < 0.50 THEN 'https://storage.keep-ph.com/packages/photo_' || gen_random_uuid()::text || '.jpg' ELSE NULL END,
  r.mailroom_registration_created_at + (random() * interval '365 days'),
  r.mailroom_registration_created_at + (random() * interval '370 days')
FROM temp_registration_ids r
CROSS JOIN generate_series(1, CASE WHEN random() < 0.6 THEN 1 WHEN random() < 0.85 THEN 2 ELSE 3 END); -- 1-3 items per registration

-- Store mailbox item IDs for reference (with user_id from registrations)
CREATE TEMP TABLE IF NOT EXISTS temp_mailbox_item_ids AS
SELECT 
  mi.mailbox_item_id,
  mi.mailroom_registration_id,
  r.user_id,
  mi.mailbox_item_status,
  mi.mailbox_item_received_at
FROM mailbox_item_table mi
INNER JOIN temp_registration_ids r ON mi.mailroom_registration_id = r.mailroom_registration_id;

-- Generate Mail Action Requests (60,000+ - THE QUEUES/USER ACTIONS)
INSERT INTO mail_action_request_table (
  mail_action_request_id,
  mailbox_item_id,
  user_id,
  mail_action_request_type,
  mail_action_request_status,
  mail_action_request_forward_address,
  mail_action_request_forward_tracking_number,
  mail_action_request_forward_3pl_name,
  mail_action_request_forward_tracking_url,
  mail_action_request_processed_at,
  mail_action_request_processed_by,
  mail_action_request_completed_at,
  mail_action_request_created_at,
  mail_action_request_updated_at
)
SELECT 
  gen_random_uuid(),
  mi.mailbox_item_id,
  mi.user_id,
  CASE 
    WHEN random() < 0.30 THEN 'SCAN'::mail_action_request_type
    WHEN random() < 0.60 THEN 'RELEASE'::mail_action_request_type
    WHEN random() < 0.80 THEN 'DISPOSE'::mail_action_request_type
    WHEN random() < 0.90 THEN 'CANCEL'::mail_action_request_type
    WHEN random() < 0.95 THEN 'REFUND'::mail_action_request_type
    ELSE 'OTHER'::mail_action_request_type
  END,
  CASE 
    WHEN random() < 0.65 THEN 'PROCESSING'::mail_action_request_status
    ELSE 'COMPLETED'::mail_action_request_status
  END,
  CASE 
    WHEN random() < 0.40 THEN '456 Forward Avenue, Quezon City, 1100'
    ELSE NULL
  END,
  CASE WHEN random() < 0.50 THEN 'TRACK-' || upper(substring(md5(random()::text) from 1 for 16)) ELSE NULL END,
  CASE WHEN random() < 0.50 THEN (ARRAY['J&T Express', 'LBC', '2GO', 'Ninja Van', 'Lalamove'])[floor(random() * 5 + 1)] ELSE NULL END,
  CASE WHEN random() < 0.50 THEN 'https://tracking.example.com/track/' || upper(substring(md5(random()::text) from 1 for 16)) ELSE NULL END,
  CASE 
    WHEN random() < 0.65 THEN NULL -- Still processing
    ELSE mi.mailbox_item_received_at + (random() * interval '7 days') -- Completed
  END,
  CASE 
    WHEN random() < 0.65 THEN NULL
    ELSE COALESCE(
      (SELECT users_id FROM users_table WHERE users_email IN ('admin@example.com', 'admin1@example.com') ORDER BY random() LIMIT 1),
      (SELECT users_id FROM users_table WHERE users_email = 'admin@example.com' LIMIT 1)
    )
  END,
  CASE 
    WHEN random() < 0.65 THEN NULL
    ELSE mi.mailbox_item_received_at + (random() * interval '10 days')
  END,
  mi.mailbox_item_received_at + (random() * interval '30 days'),
  mi.mailbox_item_received_at + (random() * interval '35 days')
FROM temp_mailbox_item_ids mi
CROSS JOIN generate_series(1, CASE 
  WHEN random() < 0.70 THEN 1  -- 70% have 1 request
  WHEN random() < 0.90 THEN 2  -- 20% have 2 requests
  ELSE 3                       -- 10% have 3 requests
END);

-- Generate Mailroom Files (60,000+ - scanned documents and package photos)
-- Files are linked to mailbox items (scanned documents, received photos, etc.)
INSERT INTO mailroom_file_table (
  mailroom_file_id,
  mailbox_item_id,
  mailroom_file_name,
  mailroom_file_url,
  mailroom_file_size_mb,
  mailroom_file_mime_type,
  mailroom_file_uploaded_at,
  mailroom_file_type
)
SELECT 
  gen_random_uuid(),
  mi.mailbox_item_id,
  CASE 
    WHEN random() < 0.50 THEN 'scan_' || substring(mi.mailbox_item_id::text from 1 for 8) || '.pdf'
    WHEN random() < 0.80 THEN 'package_photo_' || substring(mi.mailbox_item_id::text from 1 for 8) || '.jpg'
    ELSE 'document_' || substring(mi.mailbox_item_id::text from 1 for 8) || '.pdf'
  END,
  CASE 
    WHEN random() < 0.50 THEN 'https://storage.keep-ph.com/scans/scan_' || mi.mailbox_item_id::text || '.pdf'
    WHEN random() < 0.80 THEN 'https://storage.keep-ph.com/packages/photo_' || mi.mailbox_item_id::text || '.jpg'
    ELSE 'https://storage.keep-ph.com/documents/doc_' || mi.mailbox_item_id::text || '.pdf'
  END,
  CASE 
    WHEN random() < 0.50 THEN (0.5 + random() * 4.5)::numeric(10,2) -- 0.5-5 MB for scans
    ELSE (1.0 + random() * 9.0)::numeric(10,2) -- 1-10 MB for photos
  END,
  CASE 
    WHEN random() < 0.50 THEN 'application/pdf'
    ELSE 'image/jpeg'
  END,
  mi.mailbox_item_received_at + (random() * interval '5 days'),
  CASE 
    WHEN random() < 0.40 THEN 'SCANNED'::mailroom_file_type
    WHEN random() < 0.70 THEN 'RECEIVED'::mailroom_file_type
    ELSE 'RELEASED'::mailroom_file_type
  END
FROM temp_mailbox_item_ids mi
CROSS JOIN generate_series(1, CASE 
  WHEN random() < 0.60 THEN 1  -- 60% have 1 file
  WHEN random() < 0.85 THEN 2  -- 25% have 2 files
  ELSE 3                       -- 15% have 3 files
END);

-- Generate Notifications (75,000+ - user notifications)
INSERT INTO notification_table (
  notification_id,
  user_id,
  notification_title,
  notification_message,
  notification_type,
  notification_is_read,
  notification_link,
  notification_created_at
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  CASE floor(random() * 7)
    WHEN 0 THEN 'Package Arrived'
    WHEN 1 THEN 'Package Released'
    WHEN 2 THEN 'Package Disposed'
    WHEN 3 THEN 'Scan Ready'
    WHEN 4 THEN 'Payment Received'
    WHEN 5 THEN 'Reward Processed'
    ELSE 'System Update'
  END,
  CASE floor(random() * 7)
    WHEN 0 THEN 'Your package has arrived and is ready for pickup.'
    WHEN 1 THEN 'Your package has been released for delivery.'
    WHEN 2 THEN 'Your package has been disposed as requested.'
    WHEN 3 THEN 'Your document scan is ready for download.'
    WHEN 4 THEN 'Your payment of ₱' || (500 + floor(random() * 1500))::text || ' has been received.'
    WHEN 5 THEN 'Your reward claim has been processed successfully.'
    ELSE 'Important system update: Please review your account settings.'
  END,
  CASE floor(random() * 7)
    WHEN 0 THEN 'PACKAGE_ARRIVED'::notification_type
    WHEN 1 THEN 'PACKAGE_RELEASED'::notification_type
    WHEN 2 THEN 'PACKAGE_DISPOSED'::notification_type
    WHEN 3 THEN 'SCAN_READY'::notification_type
    WHEN 4 THEN 'SYSTEM'::notification_type
    WHEN 5 THEN 'REWARD_PROCESSING'::notification_type
    ELSE 'REWARD_PAID'::notification_type
  END,
  random() < 0.60, -- 60% read
  CASE WHEN random() < 0.50 THEN '/dashboard/packages' ELSE NULL END,
  u.users_created_at + (random() * interval '365 days')
FROM temp_user_ids u
CROSS JOIN generate_series(1, CASE 
  WHEN random() < 0.50 THEN 1  -- 50% have 1 notification
  WHEN random() < 0.80 THEN 2  -- 30% have 2 notifications
  WHEN random() < 0.95 THEN 3  -- 15% have 3 notifications
  ELSE 4                       -- 5% have 4 notifications
END);

-- Generate Referrals (~15,000 referrals)
INSERT INTO referral_table (
  referral_referrer_user_id,
  referral_referred_user_id,
  referral_service_type,
  referral_date_created
)
SELECT 
  u1.users_id,
  u2.users_id,
  CASE 
    WHEN random() < 0.70 THEN 'mailroom'
    WHEN random() < 0.90 THEN 'subscription'
    ELSE 'premium'
  END,
  GREATEST(u1.users_created_at, u2.users_created_at) + (random() * interval '180 days')
FROM temp_user_ids u1
CROSS JOIN temp_user_ids u2
WHERE u1.users_id != u2.users_id
  AND random() < 0.30 -- 30% chance of referral relationship
  AND u2.users_created_at > u1.users_created_at -- Referred user created after referrer
LIMIT 15000; -- Approximate limit

-- Generate Rewards Claims (~5,000 claims)
INSERT INTO rewards_claim_table (
  rewards_claim_id,
  user_id,
  rewards_claim_payment_method,
  rewards_claim_account_details,
  rewards_claim_amount,
  rewards_claim_status,
  rewards_claim_referral_count,
  rewards_claim_created_at,
  rewards_claim_processed_at,
  rewards_claim_total_referrals
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  (ARRAY['gcash', 'paymaya', 'bank_transfer', 'paypal'])[floor(random() * 4 + 1)],
  CASE floor(random() * 4)
    WHEN 0 THEN '09' || LPAD((floor(random() * 999999999)::bigint)::text, 9, '0')
    WHEN 1 THEN '09' || LPAD((floor(random() * 999999999)::bigint)::text, 9, '0')
    ELSE 'BDO Account: ' || LPAD((floor(random() * 999999999)::bigint)::text, 9, '0')
  END,
  500.00 + (floor(random() * 10) * 500.00), -- 500, 1000, 1500... up to 5000
  CASE 
    WHEN random() < 0.50 THEN 'PAID'::rewards_claim_status
    WHEN random() < 0.75 THEN 'PROCESSING'::rewards_claim_status
    WHEN random() < 0.95 THEN 'PENDING'::rewards_claim_status
    ELSE 'REJECTED'::rewards_claim_status
  END,
  5 + floor(random() * 20), -- 5-25 referrals
  u.users_created_at + (random() * interval '365 days'),
  CASE 
    WHEN random() < 0.50 THEN u.users_created_at + (random() * interval '370 days')
    ELSE NULL
  END,
  5 + floor(random() * 30)
FROM temp_user_ids u
WHERE random() < 0.10; -- 10% of users claim rewards

-- Generate Activity Logs (150,000+ - comprehensive user activity tracking)
-- Link activity logs to actual entities for realistic tracking

-- Activity logs for mail action requests (linked to actual requests)
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  mar.user_id,
  CASE mar.mail_action_request_type
    WHEN 'SCAN' THEN 'SCAN'::activity_action
    WHEN 'RELEASE' THEN 'RELEASE'::activity_action
    WHEN 'DISPOSE' THEN 'DISPOSE'::activity_action
    WHEN 'CANCEL' THEN 'CANCEL'::activity_action
    WHEN 'REFUND' THEN 'REFUND'::activity_action
    WHEN 'REWARD' THEN 'CLAIM'::activity_action
    ELSE 'SUBMIT'::activity_action
  END,
  CASE mar.mail_action_request_type
    WHEN 'SCAN' THEN 'USER_REQUEST_SCAN'::activity_type
    WHEN 'RELEASE' THEN 'USER_REQUEST_RELEASE'::activity_type
    WHEN 'DISPOSE' THEN 'USER_REQUEST_DISPOSE'::activity_type
    WHEN 'CANCEL' THEN 'USER_REQUEST_CANCEL'::activity_type
    WHEN 'REFUND' THEN 'USER_REQUEST_REFUND'::activity_type
    WHEN 'REWARD' THEN 'USER_REQUEST_REWARD'::activity_type
    ELSE 'USER_REQUEST_OTHERS'::activity_type
  END,
  'MAIL_ACTION_REQUEST'::activity_entity_type,
  mar.mail_action_request_id,
  jsonb_build_object(
    'request_id', mar.mail_action_request_id,
    'mailbox_item_id', mar.mailbox_item_id,
    'request_type', mar.mail_action_request_type,
    'request_status', mar.mail_action_request_status,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  mar.mail_action_request_created_at
FROM mail_action_request_table mar
WHERE mar.user_id IN (SELECT users_id FROM temp_user_ids);

-- Activity logs for mailbox items (viewing packages)
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  r.user_id,
  'VIEW'::activity_action,
  'USER_REQUEST_OTHERS'::activity_type,
  'MAILBOX_ITEM'::activity_entity_type,
  mi.mailbox_item_id,
  jsonb_build_object(
    'mailbox_item_id', mi.mailbox_item_id,
    'item_type', mi.mailbox_item_type,
    'item_status', mi.mailbox_item_status,
    'item_name', mi.mailbox_item_name,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  mi.mailbox_item_received_at + (random() * interval '7 days')
FROM mailbox_item_table mi
INNER JOIN temp_registration_ids r ON mi.mailroom_registration_id = r.mailroom_registration_id
WHERE r.user_id IN (SELECT users_id FROM temp_user_ids)
  AND random() < 0.60; -- 60% of mailbox items get viewed

-- Activity logs for user logins
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  'LOGIN'::activity_action,
  'USER_LOGIN'::activity_type,
  'USER'::activity_entity_type,
  u.users_id,
  jsonb_build_object(
    'user_id', u.users_id,
    'email', u.users_email,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END,
    'user_agent', CASE 
      WHEN random() < 0.5 THEN 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      WHEN random() < 0.8 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)'
      ELSE 'Mozilla/5.0 (Android 11; Mobile)'
    END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  u.users_created_at + (random() * interval '365 days')
FROM temp_user_ids u
CROSS JOIN generate_series(1, CASE 
  WHEN random() < 0.40 THEN 1  -- 40% have 1 login
  WHEN random() < 0.70 THEN 2  -- 30% have 2 logins
  WHEN random() < 0.90 THEN 3  -- 20% have 3 logins
  ELSE 4                       -- 10% have 4+ logins
END);

-- Activity logs for user logouts
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  'LOGOUT'::activity_action,
  'USER_LOGOUT'::activity_type,
  'USER'::activity_entity_type,
  u.users_id,
  jsonb_build_object(
    'user_id', u.users_id,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  u.users_created_at + (random() * interval '365 days')
FROM temp_user_ids u
CROSS JOIN generate_series(1, CASE 
  WHEN random() < 0.50 THEN 1  -- 50% have 1 logout
  WHEN random() < 0.80 THEN 2  -- 30% have 2 logouts
  ELSE 3                       -- 20% have 3+ logouts
END);

-- Activity logs for KYC submissions
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  kyc.user_id,
  'SUBMIT'::activity_action,
  'USER_KYC_SUBMIT'::activity_type,
  'USER_KYC'::activity_entity_type,
  kyc.user_kyc_id,
  jsonb_build_object(
    'kyc_id', kyc.user_kyc_id,
    'kyc_status', kyc.user_kyc_status,
    'document_type', kyc.user_kyc_id_document_type,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  kyc.user_kyc_submitted_at
FROM user_kyc_table kyc
WHERE kyc.user_id IN (SELECT users_id FROM temp_user_ids);

-- Activity logs for payment transactions
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  r.user_id,
  CASE pt.payment_transaction_type
    WHEN 'SUBSCRIPTION' THEN 'PAY'::activity_action
    WHEN 'ONE_TIME' THEN 'PAY'::activity_action
    WHEN 'REFUND' THEN 'REFUND'::activity_action
    ELSE 'PAY'::activity_action
  END,
  'USER_REQUEST_OTHERS'::activity_type,
  'PAYMENT_TRANSACTION'::activity_entity_type,
  pt.payment_transaction_id,
  jsonb_build_object(
    'transaction_id', pt.payment_transaction_id,
    'amount', pt.payment_transaction_amount,
    'status', pt.payment_transaction_status,
    'type', pt.payment_transaction_type,
    'method', pt.payment_transaction_method,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  pt.payment_transaction_created_at
FROM payment_transaction_table pt
INNER JOIN temp_registration_ids r ON pt.mailroom_registration_id = r.mailroom_registration_id
WHERE r.user_id IN (SELECT users_id FROM temp_user_ids)
  AND random() < 0.80; -- 80% of payments get logged

-- Activity logs for subscriptions
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  r.user_id,
  'CREATE'::activity_action,
  'USER_REQUEST_OTHERS'::activity_type,
  'SUBSCRIPTION'::activity_entity_type,
  s.subscription_id,
  jsonb_build_object(
    'subscription_id', s.subscription_id,
    'billing_cycle', s.subscription_billing_cycle,
    'auto_renew', s.subscription_auto_renew,
    'expires_at', s.subscription_expires_at,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  s.subscription_created_at
FROM subscription_table s
INNER JOIN temp_registration_ids r ON s.mailroom_registration_id = r.mailroom_registration_id
WHERE r.user_id IN (SELECT users_id FROM temp_user_ids);

-- Activity logs for rewards claims
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  rc.user_id,
  'CLAIM'::activity_action,
  'USER_REQUEST_REWARD'::activity_type,
  'REWARDS_CLAIM'::activity_entity_type,
  rc.rewards_claim_id,
  jsonb_build_object(
    'claim_id', rc.rewards_claim_id,
    'amount', rc.rewards_claim_amount,
    'status', rc.rewards_claim_status,
    'referral_count', rc.rewards_claim_referral_count,
    'payment_method', rc.rewards_claim_payment_method,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  rc.rewards_claim_created_at
FROM rewards_claim_table rc
WHERE rc.user_id IN (SELECT users_id FROM temp_user_ids);

-- Activity logs for profile updates
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  u.users_id,
  'UPDATE'::activity_action,
  'USER_UPDATE_PROFILE'::activity_type,
  'USER'::activity_entity_type,
  u.users_id,
  jsonb_build_object(
    'user_id', u.users_id,
    'fields_updated', (ARRAY['email', 'mobile_number', 'avatar_url', 'address'])[floor(random() * 4 + 1)],
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  u.users_created_at + (random() * interval '365 days')
FROM temp_user_ids u
WHERE random() < 0.30; -- 30% of users update their profile

-- Activity logs for mailroom registrations
INSERT INTO activity_log_table (
  activity_log_id,
  user_id,
  activity_action,
  activity_type,
  activity_entity_type,
  activity_entity_id,
  activity_details,
  activity_ip_address,
  activity_created_at
)
SELECT 
  gen_random_uuid(),
  r.user_id,
  'REGISTER'::activity_action,
  'USER_REQUEST_OTHERS'::activity_type,
  'MAILROOM_REGISTRATION'::activity_entity_type,
  r.mailroom_registration_id,
  jsonb_build_object(
    'registration_id', r.mailroom_registration_id,
    'location_id', r.mailroom_location_id,
    'registration_code', r.mailroom_registration_code,
    'source', CASE WHEN random() < 0.7 THEN 'web' ELSE 'mobile' END
  ),
  '192.168.' || floor(random() * 255)::text || '.' || floor(random() * 255)::text,
  r.mailroom_registration_created_at
FROM temp_registration_ids r
WHERE r.user_id IN (SELECT users_id FROM temp_user_ids);

-- Clean up temp tables
DROP TABLE IF EXISTS temp_user_ids;
DROP TABLE IF EXISTS temp_plan_ids;
DROP TABLE IF EXISTS temp_location_ids;
DROP TABLE IF EXISTS temp_registration_ids;
DROP TABLE IF EXISTS temp_locker_ids;
DROP TABLE IF EXISTS temp_mailbox_item_ids;
DROP TABLE IF EXISTS temp_available_lockers;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Display summary statistics
DO $$
DECLARE
  v_users_count INT;
  v_registrations_count INT;
  v_assigned_lockers_count INT;
  v_mailbox_items_count INT;
  v_mailroom_files_count INT;
  v_action_requests_count INT;
  v_notifications_count INT;
  v_activity_logs_count INT;
BEGIN
  SELECT COUNT(*) INTO v_users_count FROM users_table WHERE users_email LIKE '%@test.keep-ph.com' OR users_email IN ('user1@example.com', 'user2@example.com', 'user3@example.com');
  SELECT COUNT(*) INTO v_registrations_count FROM mailroom_registration_table;
  SELECT COUNT(*) INTO v_assigned_lockers_count FROM mailroom_assigned_locker_table;
  SELECT COUNT(*) INTO v_mailbox_items_count FROM mailbox_item_table;
  SELECT COUNT(*) INTO v_mailroom_files_count FROM mailroom_file_table;
  SELECT COUNT(*) INTO v_action_requests_count FROM mail_action_request_table;
  SELECT COUNT(*) INTO v_notifications_count FROM notification_table;
  SELECT COUNT(*) INTO v_activity_logs_count FROM activity_log_table;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed Data Generation Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users: %', v_users_count;
  RAISE NOTICE 'Mailroom Registrations: %', v_registrations_count;
  RAISE NOTICE 'Assigned Lockers: %', v_assigned_lockers_count;
  RAISE NOTICE 'Mailbox Items: %', v_mailbox_items_count;
  RAISE NOTICE 'Mailroom Files: %', v_mailroom_files_count;
  RAISE NOTICE 'Mail Action Requests (Queues): %', v_action_requests_count;
  RAISE NOTICE 'Notifications: %', v_notifications_count;
  RAISE NOTICE 'Activity Logs: %', v_activity_logs_count;
  RAISE NOTICE '========================================';
END $$;
