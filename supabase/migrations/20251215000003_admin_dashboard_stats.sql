-- RPC to aggregate admin dashboard statistics in a single call
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON;
BEGIN
  WITH pkg_counts AS (
    SELECT
      COUNT(*) FILTER (
        WHERE mailbox_item_status IN ('REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
        AND mailbox_item_deleted_at IS NULL
      ) AS pending_count,
      COUNT(*) FILTER (
        WHERE mailbox_item_status IN ('STORED', 'REQUEST_TO_SCAN', 'REQUEST_TO_RELEASE', 'REQUEST_TO_DISPOSE')
        AND mailbox_item_deleted_at IS NULL
      ) AS stored_count
    FROM public.mailbox_item_table
  ),
  sub_counts AS (
    SELECT COUNT(*) AS total_subscribers 
    FROM public.mailroom_registration_table
    WHERE mailroom_registration_status = true
  ),
  locker_totals AS (
    SELECT COUNT(*) AS total_lockers 
    FROM public.location_locker_table
    WHERE location_locker_deleted_at IS NULL
  ),
  assigned_locker_totals AS (
    SELECT COUNT(*) AS assigned_lockers 
    FROM public.mailroom_assigned_locker_table
  ),
  recent_base AS (
    -- Optimize: Limit the base table scan before joining
    SELECT
      mailbox_item_id,
      mailbox_item_name,
      mailbox_item_type,
      mailbox_item_status,
      mailbox_item_received_at,
      mailroom_registration_id
    FROM public.mailbox_item_table
    WHERE mailbox_item_deleted_at IS NULL
    ORDER BY mailbox_item_received_at DESC NULLS LAST
    LIMIT 5
  ),
  recent AS (
    -- Only join on the 5 rows found
    SELECT
      rb.mailbox_item_id as id,
      rb.mailbox_item_name as package_name,
      rb.mailbox_item_type as package_type,
      rb.mailbox_item_status as status,
      rb.mailbox_item_received_at as received_at,
      COALESCE(
        CONCAT_WS(' ', uk.user_kyc_first_name, uk.user_kyc_last_name),
        ml.mailroom_location_name,
        CONCAT('Mailroom #', SUBSTRING(mr.mailroom_registration_id::TEXT FROM 1 FOR 8))
      ) AS full_name
    FROM recent_base rb
    LEFT JOIN public.mailroom_registration_table mr
      ON mr.mailroom_registration_id = rb.mailroom_registration_id
    LEFT JOIN public.mailroom_location_table ml
      ON ml.mailroom_location_id = mr.mailroom_location_id
    LEFT JOIN public.users_table u
      ON u.users_id = mr.user_id
    LEFT JOIN public.user_kyc_table uk
      ON uk.user_id = u.users_id
  ),
  recent_payload AS (
    SELECT COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', r.id,
          'package_name', r.package_name,
          'package_type', r.package_type,
          'status', r.status,
          'received_at', r.received_at,
          'registration', CASE 
            WHEN r.full_name IS NULL THEN NULL 
            ELSE JSON_BUILD_OBJECT('full_name', r.full_name) 
          END
        )
        ORDER BY r.received_at DESC NULLS LAST
      ),
      '[]'::JSON
    ) AS recent_packages
    FROM recent r
  )
    SELECT JSON_BUILD_OBJECT(
      'pendingRequests', pc.pending_count,
      'storedPackages', pc.stored_count,
      'totalSubscribers', sc.total_subscribers,
      'lockerStats', JSON_BUILD_OBJECT(
        'total', lt.total_lockers,
        'assigned', alt.assigned_lockers
      ),
      'recentPackages', rp.recent_packages
    )
    INTO result
    FROM pkg_counts pc
    CROSS JOIN sub_counts sc
    CROSS JOIN locker_totals lt
    CROSS JOIN assigned_locker_totals alt
    CROSS JOIN recent_payload rp;

  RETURN result;
END;
$$;
