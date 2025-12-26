CREATE OR REPLACE FUNCTION public.get_user_mailroom_stats(input_user_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'stored', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) NOT IN ('RELEASED','RETRIEVED','DISPOSED') THEN 1 ELSE 0 END), 0),
    'pending', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) LIKE 'REQUEST%' THEN 1 ELSE 0 END), 0),
    'released', COALESCE(SUM(CASE WHEN UPPER(m.mailbox_item_status::text) = 'RELEASED' THEN 1 ELSE 0 END), 0)
  )
  FROM public.mailbox_item_table m
  JOIN public.mailroom_registration_table r ON r.mailroom_registration_id = m.mailroom_registration_id
  WHERE r.user_id = input_user_id;
$$;