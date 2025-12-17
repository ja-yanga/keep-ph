-- =============================
-- Unique Indexes
-- =============================

-- Prevent duplicate locker codes per location
CREATE UNIQUE INDEX IF NOT EXISTS uq_locker_location_code
  ON public.locker_table (location_table_id, locker_code);

-- =============================
-- Address Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_address_user
  ON public.address_table (user_table_id);

-- =============================
-- KYC Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_kyc_user
  ON public.kyc_table (user_table_id);

-- =============================
-- Notification Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_notification_user
  ON public.notification_table (user_table_id);

-- =============================
-- Referral Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_referral_user
  ON public.referral_table (user_table_id);

-- =============================
-- Reward Claim Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_reward_user
  ON public.reward_claim_table (user_table_id);

-- =============================
-- Registration Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_registration_user
  ON public.registration_table (user_table_id);
CREATE INDEX IF NOT EXISTS idx_registration_location
  ON public.registration_table (location_table_id);
CREATE INDEX IF NOT EXISTS idx_registration_plan
  ON public.registration_table (plan_table_id);

-- =============================
-- Assignment Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_assignment_registration
  ON public.assignment_table (registration_table_id);
CREATE INDEX IF NOT EXISTS idx_assignment_locker
  ON public.assignment_table (locker_table_id);

-- =============================
-- Package Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_package_registration
  ON public.package_table (registration_table_id);
CREATE INDEX IF NOT EXISTS idx_package_locker
  ON public.package_table (locker_table_id);
CREATE INDEX IF NOT EXISTS idx_package_release_address
  ON public.package_table (release_address_table_id);

-- =============================
-- Scan Table Indexes
-- =============================
CREATE INDEX IF NOT EXISTS idx_scan_package
  ON public.scan_table (package_table_id);
