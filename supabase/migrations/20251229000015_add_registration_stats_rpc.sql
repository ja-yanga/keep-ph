-- RPC: get user mailroom registration stats (per registration)
-- Returns stats for each registration: stored, pending, released counts
CREATE OR REPLACE FUNCTION public.get_user_mailroom_registration_stats(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailroom_registration_id', r.mailroom_registration_id,
        'stored', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) NOT IN ('RELEASED','RETRIEVED','DISPOSED') THEN 1 ELSE 0 END), 0),
        'pending', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) LIKE 'REQUEST%' THEN 1 ELSE 0 END), 0),
        'released', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) = 'RELEASED' THEN 1 ELSE 0 END), 0)
      )
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.mailroom_registration_table r
  LEFT JOIN public.mailbox_item_table m ON m.mailroom_registration_id = r.mailroom_registration_id
  WHERE r.user_id = input_user_id
  GROUP BY r.mailroom_registration_id;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_mailroom_registration_stats(UUID) TO anon;

