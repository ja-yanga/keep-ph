-- ============================================================================
-- Query: Get One User with Assigned Locker
-- ============================================================================
-- This query shows a single user with their assigned locker information
-- Useful for testing and debugging assigned locker relationships
-- ============================================================================

-- Get one user with their assigned locker details
SELECT 
  u.users_id,
  u.users_email,
  u.mobile_number,
  u.users_role,
  u.users_is_verified,
  u.users_created_at,
  -- Registration info
  mr.mailroom_registration_id,
  mr.mailroom_registration_code,
  mr.mailroom_registration_status,
  mr.mailroom_registration_created_at,
  -- Location info
  ml.mailroom_location_id,
  ml.mailroom_location_name,
  ml.mailroom_location_city,
  -- Plan info
  mp.mailroom_plan_name,
  mp.mailroom_plan_price,
  -- Assigned locker info
  malt.mailroom_assigned_locker_id,
  malt.mailroom_assigned_locker_status,
  malt.mailroom_assigned_locker_assigned_at,
  -- Locker details
  ll.location_locker_id,
  ll.location_locker_code,
  ll.location_locker_is_available,
  ll.location_locker_created_at
FROM users_table u
INNER JOIN mailroom_registration_table mr 
  ON u.users_id = mr.user_id
INNER JOIN mailroom_assigned_locker_table malt 
  ON mr.mailroom_registration_id = malt.mailroom_registration_id
INNER JOIN location_locker_table ll 
  ON malt.location_locker_id = ll.location_locker_id
LEFT JOIN mailroom_location_table ml 
  ON mr.mailroom_location_id = ml.mailroom_location_id
LEFT JOIN mailroom_plan_table mp 
  ON mr.mailroom_plan_id = mp.mailroom_plan_id
WHERE ll.location_locker_deleted_at IS NULL
LIMIT 1;

-- Alternative: Get a specific user by email (e.g., one of the test users)
-- Uncomment and modify the email as needed:
/*
SELECT 
  u.users_id,
  u.users_email,
  u.mobile_number,
  u.users_role,
  u.users_is_verified,
  -- Registration info
  mr.mailroom_registration_id,
  mr.mailroom_registration_code,
  mr.mailroom_registration_status,
  -- Location info
  ml.mailroom_location_name,
  ml.mailroom_location_city,
  -- Plan info
  mp.mailroom_plan_name,
  -- Assigned locker info
  malt.mailroom_assigned_locker_id,
  malt.mailroom_assigned_locker_status,
  malt.mailroom_assigned_locker_assigned_at,
  -- Locker details
  ll.location_locker_code,
  ll.location_locker_is_available
FROM users_table u
INNER JOIN mailroom_registration_table mr 
  ON u.users_id = mr.user_id
INNER JOIN mailroom_assigned_locker_table malt 
  ON mr.mailroom_registration_id = malt.mailroom_registration_id
INNER JOIN location_locker_table ll 
  ON malt.location_locker_id = ll.location_locker_id
LEFT JOIN mailroom_location_table ml 
  ON mr.mailroom_location_id = ml.mailroom_location_id
LEFT JOIN mailroom_plan_table mp 
  ON mr.mailroom_plan_id = mp.mailroom_plan_id
WHERE u.users_email = 'user1@example.com'  -- Change to any user email
  AND ll.location_locker_deleted_at IS NULL;
*/

-- Alternative: Get user with assigned locker in a more readable format
-- Shows all assigned lockers for one user (in case they have multiple)
SELECT 
  u.users_email,
  u.mobile_number,
  mr.mailroom_registration_code,
  ml.mailroom_location_name AS location,
  mp.mailroom_plan_name AS plan,
  ll.location_locker_code AS locker_code,
  malt.mailroom_assigned_locker_status AS locker_status,
  malt.mailroom_assigned_locker_assigned_at AS assigned_at,
  ll.location_locker_is_available AS locker_available
FROM users_table u
INNER JOIN mailroom_registration_table mr 
  ON u.users_id = mr.user_id
INNER JOIN mailroom_assigned_locker_table malt 
  ON mr.mailroom_registration_id = malt.mailroom_registration_id
INNER JOIN location_locker_table ll 
  ON malt.location_locker_id = ll.location_locker_id
LEFT JOIN mailroom_location_table ml 
  ON mr.mailroom_location_id = ml.mailroom_location_id
LEFT JOIN mailroom_plan_table mp 
  ON mr.mailroom_plan_id = mp.mailroom_plan_id
WHERE ll.location_locker_deleted_at IS NULL
ORDER BY malt.mailroom_assigned_locker_assigned_at DESC
LIMIT 1;
