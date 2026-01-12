-- ============================================================================
-- EXPLAIN ANALYZE Performance Testing Script
-- ============================================================================
-- This script runs EXPLAIN ANALYZE across "heavy" datasets to identify 
-- performance bottlenecks. 
--
-- Target Modules:
-- 1. Admin Modules (Dashboard, Logs, User Mgmt)
-- 2. Mailrooms (Locations, Lockers)
-- 3. Packages (Inventory, Action Requests)
-- 4. Plans (Subscriptions, Payments)
-- 5. Rewards (Referrals, Claims)
-- 6. Stats (Aggregations, Trends)
--
-- USAGE:
-- Run individual blocks to see the execution plan and actual time taken.
-- ============================================================================

-- Setup: Get a sample user and registration ID for targeted queries
-- These variables are for use in tools that support them (like psql or DBeaver)
-- Otherwise, replace the UUIDs manually below.

/*
WITH sample_user AS (SELECT users_id FROM users_table LIMIT 1),
     sample_reg AS (SELECT mailroom_registration_id FROM mailroom_registration_table LIMIT 1)
SELECT * FROM sample_user, sample_reg;
*/

-- ============================================================================
-- 1. ADMIN MODULES
-- ============================================================================

-- ========== Admin Dashboard Stats ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_dashboard_stats();

-- DIRECT SQL (extracted from admin_dashboard_stats RPC - matches initial_schema.sql lines 728-821):
EXPLAIN ANALYZE
WITH pkg_counts AS (
  SELECT
    COUNT(*) FILTER (
      WHERE mailbox_item_status IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    ) AS pending_count,
    COUNT(*) FILTER (
      WHERE mailbox_item_status IN ('STORED', 'REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
    ) AS stored_count
  FROM public.mailbox_item_table
),
sub_counts AS (
  SELECT COUNT(*) AS total_subscribers FROM public.mailroom_registration_table
),
locker_totals AS (
  SELECT COUNT(*) AS total_lockers FROM public.location_locker_table
),
assigned_locker_totals AS (
  SELECT COUNT(*) AS assigned_lockers FROM public.mailroom_assigned_locker_table
),
recent AS (
  SELECT
    mi.mailbox_item_id,
    mi.mailbox_item_name,
    mi.mailbox_item_type,
    mi.mailbox_item_status,
    mi.mailbox_item_received_at,
    COALESCE(
      CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
      ml.mailroom_location_name,
      CONCAT('Mailroom #', SUBSTRING(mr.mailroom_registration_id::TEXT FROM 1 FOR 8))
    ) AS full_name
  FROM public.mailbox_item_table mi
  LEFT JOIN public.mailroom_registration_table mr
    ON mr.mailroom_registration_id = mi.mailroom_registration_id
  LEFT JOIN public.mailroom_location_table ml
    ON ml.mailroom_location_id = mr.mailroom_location_id
  LEFT JOIN public.users_table u
    ON u.users_id = mr.user_id
  LEFT JOIN public.user_kyc_table uk
    ON uk.user_id = u.users_id
  ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
  LIMIT 5
),
recent_payload AS (
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', r.mailbox_item_id,
        'package_name', r.mailbox_item_name,
        'package_type', r.mailbox_item_type,
        'status', r.mailbox_item_status,
        'received_at', r.mailbox_item_received_at,
        'registration', CASE
          WHEN r.full_name IS NULL THEN NULL
          ELSE JSON_BUILD_OBJECT('full_name', r.full_name)
        END
      )
      ORDER BY r.mailbox_item_received_at DESC NULLS LAST
    ),
    '[]'::JSON
  ) AS recent_packages
  FROM recent r
)
SELECT 
  pkg_counts.pending_count,
  pkg_counts.stored_count,
  sub_counts.total_subscribers,
  locker_totals.total_lockers,
  assigned_locker_totals.assigned_lockers,
  recent_payload.recent_packages
FROM pkg_counts
CROSS JOIN sub_counts
CROSS JOIN locker_totals
CROSS JOIN assigned_locker_totals
CROSS JOIN recent_payload;

-- ========== Admin List User KYC ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_list_user_kyc(
    input_search := '',
    input_limit := 50
);

-- DIRECT SQL (extracted from admin_list_user_kyc RPC):
EXPLAIN ANALYZE
SELECT
  uk.user_kyc_id,
  uk.user_id,
  uk.user_kyc_status,
  uk.user_kyc_id_document_type,
  uk.user_kyc_id_number,
  uk.user_kyc_id_front_url,
  uk.user_kyc_id_back_url,
  uk.user_kyc_first_name,
  uk.user_kyc_last_name,
  uk.user_kyc_submitted_at,
  uk.user_kyc_verified_at,
  uk.user_kyc_created_at,
  uk.user_kyc_updated_at,
  addr.user_kyc_address_line_one AS addr_line1,
  addr.user_kyc_address_line_two AS addr_line2,
  addr.user_kyc_address_city AS addr_city,
  addr.user_kyc_address_region AS addr_region,
  addr.user_kyc_address_postal_code AS addr_postal
FROM public.user_kyc_table uk
LEFT JOIN LATERAL (
  SELECT *
  FROM public.user_kyc_address_table a
  WHERE a.user_kyc_id = uk.user_kyc_id
  ORDER BY a.user_kyc_address_created_at DESC
  LIMIT 1
) addr ON TRUE
WHERE '' = '' OR uk.user_kyc_first_name ILIKE '%' || '' || '%' OR uk.user_kyc_last_name ILIKE '%' || '' || '%'
ORDER BY uk.user_kyc_submitted_at DESC NULLS LAST
LIMIT 50;


-- ============================================================================
-- 2. MAILROOMS
-- ============================================================================

-- ========== Admin List Mailroom Locations ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_list_mailroom_locations();

-- DIRECT SQL (extracted from admin_list_mailroom_locations RPC):
EXPLAIN ANALYZE
SELECT 
  mailroom_location_id,
  mailroom_location_name,
  mailroom_location_region,
  mailroom_location_city,
  mailroom_location_barangay,
  mailroom_location_zip,
  mailroom_location_total_lockers,
  mailroom_location_prefix
FROM public.mailroom_location_table
ORDER BY mailroom_location_name ASC;

-- ========== Location Availability and Utilization ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.get_location_availability('{}'::JSON);

-- DIRECT SQL (extracted from get_location_availability RPC):
EXPLAIN ANALYZE
SELECT 
    mailroom_location_id,
    COUNT(*)::INTEGER as locker_count
FROM public.location_locker_table
WHERE location_locker_is_available = TRUE
GROUP BY mailroom_location_id;

-- ========== Admin Assigned Lockers List ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_get_assigned_lockers();

-- DIRECT SQL (extracted from admin_get_assigned_lockers RPC):
EXPLAIN ANALYZE
SELECT 
  malt.mailroom_assigned_locker_id,
  malt.mailroom_registration_id,
  malt.location_locker_id,
  malt.mailroom_assigned_locker_status,
  malt.mailroom_assigned_locker_assigned_at,
  mrt.mailroom_registration_id AS reg_id,
  mrt.user_id,
  ut.users_email,
  llt.location_locker_id AS locker_id,
  llt.location_locker_code,
  llt.location_locker_is_available
FROM mailroom_assigned_locker_table malt
JOIN mailroom_registration_table mrt ON malt.mailroom_registration_id = mrt.mailroom_registration_id
JOIN users_table ut ON mrt.user_id = ut.users_id
JOIN location_locker_table llt ON malt.location_locker_id = llt.location_locker_id;


-- ============================================================================
-- 3. PACKAGES (Inventory & Action Requests)
-- ============================================================================

-- ========== Admin Active Packages ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.get_admin_mailroom_packages(
    input_limit := 50,
    input_offset := 0,
    input_compact := false
);

-- DIRECT SQL (extracted from get_admin_mailroom_packages RPC - core query pattern):
EXPLAIN ANALYZE
SELECT 
  mi.mailbox_item_id,
  mi.mailbox_item_name,
  mi.mailroom_registration_id,
  mi.location_locker_id,
  mi.mailbox_item_type,
  mi.mailbox_item_status,
  mi.mailbox_item_photo,
  mi.mailbox_item_release_address,
  mi.user_address_id,
  mi.mailbox_item_received_at,
  mi.mailbox_item_created_at,
  mi.mailbox_item_updated_at,
  mr.mailroom_registration_code,
  ll.location_locker_code,
  u.users_email,
  u.mobile_number,
  uk.user_kyc_first_name,
  uk.user_kyc_last_name,
  ml.mailroom_location_name,
  p.mailroom_plan_id,
  p.mailroom_plan_name,
  p.mailroom_plan_can_receive_mail,
  p.mailroom_plan_can_receive_parcels,
  (
    SELECT JSON_AGG(ROW_TO_JSON(mft))
    FROM public.mailroom_file_table mft
    WHERE mft.mailbox_item_id = mi.mailbox_item_id
  ) AS files
FROM public.mailbox_item_table mi
LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
LEFT JOIN public.users_table u ON u.users_id = mr.user_id
LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
WHERE mi.mailbox_item_deleted_at IS NULL
ORDER BY mi.mailbox_item_received_at DESC NULLS LAST
LIMIT 50
OFFSET 0;

-- ========== Admin Archived Packages ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.get_admin_archived_packages(
    input_limit := 50,
    input_offset := 0
);

-- DIRECT SQL (extracted from get_admin_archived_packages RPC):
EXPLAIN ANALYZE
SELECT 
  mi.mailbox_item_id,
  mi.mailbox_item_name,
  mi.mailroom_registration_id,
  mi.location_locker_id,
  mi.mailbox_item_type,
  mi.mailbox_item_status,
  mi.mailbox_item_photo,
  mi.mailbox_item_received_at,
  mi.mailbox_item_created_at,
  mi.mailbox_item_updated_at,
  mi.mailbox_item_deleted_at,
  mr.mailroom_registration_code,
  ll.location_locker_code,
  u.users_email,
  u.mobile_number,
  uk.user_kyc_first_name,
  uk.user_kyc_last_name,
  ml.mailroom_location_name,
  p.mailroom_plan_id,
  p.mailroom_plan_name,
  p.mailroom_plan_can_receive_mail,
  p.mailroom_plan_can_receive_parcels,
  (
    SELECT JSON_AGG(ROW_TO_JSON(mft))
    FROM public.mailroom_file_table mft
    WHERE mft.mailbox_item_id = mi.mailbox_item_id
  ) AS files
FROM public.mailbox_item_table mi
LEFT JOIN public.mailroom_registration_table mr ON mr.mailroom_registration_id = mi.mailroom_registration_id
LEFT JOIN public.location_locker_table ll ON ll.location_locker_id = mi.location_locker_id
LEFT JOIN public.users_table u ON u.users_id = mr.user_id
LEFT JOIN public.user_kyc_table uk ON uk.user_id = u.users_id
LEFT JOIN public.mailroom_location_table ml ON ml.mailroom_location_id = mr.mailroom_location_id
LEFT JOIN public.mailroom_plan_table p ON p.mailroom_plan_id = mr.mailroom_plan_id
WHERE mi.mailbox_item_deleted_at IS NOT NULL
ORDER BY mi.mailbox_item_deleted_at DESC
LIMIT 50
OFFSET 0;


-- ============================================================================
-- 4. PLANS (Subscriptions & Payments)
-- ============================================================================

-- ========== Admin List Mailroom Plans ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_list_mailroom_plans();

-- DIRECT SQL (extracted from admin_list_mailroom_plans RPC):
EXPLAIN ANALYZE
SELECT 
  mailroom_plan_id,
  mailroom_plan_name,
  mailroom_plan_price,
  mailroom_plan_description,
  mailroom_plan_storage_limit,
  mailroom_plan_can_receive_mail,
  mailroom_plan_can_receive_parcels,
  mailroom_plan_can_digitize
FROM public.mailroom_plan_table
ORDER BY mailroom_plan_price ASC;

-- ========== Expiring Subscriptions ==========
-- DIRECT SQL (Used in cron job - app/api/admin/mailroom/cron/route.ts):
EXPLAIN ANALYZE
SELECT 
  s.subscription_id,
  s.mailroom_registration_id,
  s.subscription_expires_at,
  s.subscription_auto_renew,
  s.subscription_billing_cycle
FROM subscription_table s
WHERE s.subscription_expires_at <= now();


-- ============================================================================
-- 5. REWARDS (Referrals & Claims)
-- ============================================================================

-- ========== Admin Reward Claims List ==========
-- RPC CALL:
EXPLAIN ANALYZE SELECT * FROM public.admin_list_reward_claims();

-- DIRECT SQL (extracted from admin_list_reward_claims RPC):
EXPLAIN ANALYZE
SELECT 
  r.rewards_claim_id,
  r.user_id,
  r.rewards_claim_payment_method,
  r.rewards_claim_account_details,
  r.rewards_claim_amount,
  r.rewards_claim_status,
  r.rewards_claim_referral_count,
  COALESCE(r.rewards_claim_total_referrals, r.rewards_claim_referral_count) AS total_referrals,
  r.rewards_claim_created_at,
  r.rewards_claim_processed_at,
  r.rewards_claim_proof_path,
  u.users_id AS user_users_id,
  u.users_email,
  u.users_referral_code
FROM public.rewards_claim_table r
LEFT JOIN public.users_table u ON u.users_id = r.user_id
ORDER BY r.rewards_claim_created_at DESC;


-- ============================================================================
-- 6. STATS (System Aggregations)
-- ============================================================================

-- ========== User Mailroom Stats ==========
-- RPC CALL:
EXPLAIN ANALYZE 
SELECT * FROM public.get_user_mailroom_stats(
    (SELECT users_id FROM users_table WHERE users_role = 'user' LIMIT 1)
);

-- DIRECT SQL (extracted from get_user_mailroom_stats RPC):
EXPLAIN ANALYZE
SELECT 
  COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) NOT IN ('RELEASED','RETRIEVED','DISPOSED') THEN 1 ELSE 0 END), 0) AS stored,
  COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) LIKE 'REQUEST%' THEN 1 ELSE 0 END), 0) AS pending,
  COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) = 'RELEASED' THEN 1 ELSE 0 END), 0) AS released
FROM public.mailbox_item_table m
JOIN public.mailroom_registration_table r ON r.mailroom_registration_id = m.mailroom_registration_id
WHERE r.user_id = (SELECT users_id FROM users_table WHERE users_role = 'user' LIMIT 1);

-- ========== Registration Scans History ==========
-- RPC CALL:
EXPLAIN ANALYZE 
SELECT * FROM public.get_registration_scans(
    (SELECT jsonb_build_object(
        'registration_id', mailroom_registration_id,
        'user_id', user_id
    ) FROM mailroom_registration_table LIMIT 1)
);

-- DIRECT SQL (extracted from get_registration_scans RPC - matches core logic):
EXPLAIN ANALYZE
WITH reg_info AS (
  SELECT 
      mrt.user_id,
      COALESCE(mpt.mailroom_plan_storage_limit, 100) as limit_mb
  FROM mailroom_registration_table mrt
  JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
  WHERE mrt.mailroom_registration_id = (SELECT mailroom_registration_id FROM mailroom_registration_table LIMIT 1)
),
reg_files AS (
  SELECT 
    mft.mailroom_file_id,
    mft.mailbox_item_id,
    mft.mailroom_file_name,
    mft.mailroom_file_url,
    mft.mailroom_file_size_mb,
    mft.mailroom_file_mime_type,
    mft.mailroom_file_uploaded_at,
    mft.mailroom_file_type,
    mit.mailbox_item_id AS item_id,
    mit.mailbox_item_name,
    mit.mailroom_registration_id
  FROM mailroom_file_table mft
  JOIN mailbox_item_table mit ON mft.mailbox_item_id = mit.mailbox_item_id
  WHERE mit.mailroom_registration_id = (SELECT mailroom_registration_id FROM mailroom_registration_table LIMIT 1)
)
SELECT 
  (SELECT limit_mb FROM reg_info) as storage_limit,
  SUM(mailroom_file_size_mb) as used_mb,
  COUNT(*) as file_count
FROM reg_files;
