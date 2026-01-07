CREATE OR REPLACE FUNCTION public.get_user_kyc_with_populated_user(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT 
      to_jsonb(kyc.*) || 
      jsonb_build_object(
        'user', jsonb_build_object(
          'users_id', users.users_id,
          'users_email', users.users_email,
          'users_avatar_url', users.users_avatar_url
        )
      )
    FROM public.user_kyc_table AS kyc
    LEFT JOIN public.users_table AS users
      ON kyc.user_id = users.users_id
    WHERE kyc.user_id = input_user_id
    LIMIT 1
  );
END;
$$;