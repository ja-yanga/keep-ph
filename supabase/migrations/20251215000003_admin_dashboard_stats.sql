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
  SELECT JSON_BUILD_OBJECT(
    'pendingRequests', pkg_counts.pending_count,
    'storedPackages', pkg_counts.stored_count,
    'totalSubscribers', sub_counts.total_subscribers,
    'lockerStats', JSON_BUILD_OBJECT(
      'total', locker_totals.total_lockers,
      'assigned', assigned_locker_totals.assigned_lockers
    ),
    'recentPackages', recent_payload.recent_packages
  )
  INTO result
  FROM pkg_counts
  CROSS JOIN sub_counts
  CROSS JOIN locker_totals
  CROSS JOIN assigned_locker_totals
  CROSS JOIN recent_payload;

  RETURN result;
END;
$$;
