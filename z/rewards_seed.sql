WITH new_users AS (
  INSERT INTO users_table (
    users_id,
    users_email,
    users_role,
    users_is_verified,
    users_referral_code,
    mobile_number
  )
  SELECT
    gen_random_uuid(),
    'invited_user' || gs || '@example.com',
    'user',
    false,
    'INV' || LPAD(gs::text, 4, '0'),
    '0918' || LPAD(gs::text, 7, '0')
  FROM generate_series(1, 10) AS gs
  RETURNING users_id
)
INSERT INTO referral_table (
  referral_referrer_user_id,
  referral_referred_user_id,
  referral_service_type
)
SELECT
  'dcab2a85-0974-459d-a7a4-8ca72f79452a',
  users_id,
  'email_invite'
FROM new_users;
