-- Rewards status RPC consolidates referral count + claims metadata
CREATE OR REPLACE FUNCTION get_rewards_status(input_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  threshold CONSTANT INTEGER := 10;
  default_amount CONSTANT NUMERIC := 500;
  referral_cnt INTEGER := 0;
  claims JSON := '[]'::JSON;
  has_processing_or_paid BOOLEAN := FALSE;
BEGIN
  IF input_user_id IS NULL THEN
    RAISE EXCEPTION 'input_user_id is required';
  END IF;

  SELECT COUNT(*)
  INTO referral_cnt
  FROM public.referral_table
  WHERE referral_referrer_user_id = input_user_id;

  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', rewards_claim_id,
        'user_id', user_id,
        'payment_method', rewards_claim_payment_method,
        'account_details', rewards_claim_account_details,
        'amount', rewards_claim_amount,
        'status', rewards_claim_status,
        'referral_count', rewards_claim_referral_count,
        'created_at', rewards_claim_created_at,
        'processed_at', rewards_claim_processed_at,
        'proof_path', rewards_claim_proof_path
      )
      ORDER BY rewards_claim_created_at DESC
    ),
    '[]'::JSON
  )
  INTO claims
  FROM public.rewards_claim_table
  WHERE user_id = input_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.rewards_claim_table
    WHERE user_id = input_user_id
      AND rewards_claim_status IN ('PROCESSING', 'PAID')
  )
  INTO has_processing_or_paid;

  RETURN JSON_BUILD_OBJECT(
    'threshold', threshold,
    'amount', default_amount,
    'referralCount', referral_cnt,
    'eligible', referral_cnt >= threshold,
    'hasClaim', has_processing_or_paid,
    'claims', claims
  );
END;
$$;

-- RPC: handle reward claim creation with eligibility checks
CREATE OR REPLACE FUNCTION request_reward_claim(
  input_user_id UUID,
  input_payment_method TEXT,
  input_account_details TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  threshold CONSTANT INTEGER := 10;
  default_amount CONSTANT NUMERIC := 500;
  referral_cnt INTEGER := 0;
  existing_claim_id UUID;
  inserted_claim public.rewards_claim_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL
     OR input_payment_method IS NULL
     OR input_account_details IS NULL
  THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Missing fields',
      'status', 400
    );
  END IF;

  SELECT COUNT(*)
  INTO referral_cnt
  FROM public.referral_table
  WHERE referral_referrer_user_id = input_user_id;

  IF referral_cnt < threshold THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Not enough referrals',
      'status', 403
    );
  END IF;

  SELECT rewards_claim_id
  INTO existing_claim_id
  FROM public.rewards_claim_table
  WHERE user_id = input_user_id
    AND rewards_claim_status IN ('PENDING', 'PROCESSING', 'PAID')
  LIMIT 1;

  IF existing_claim_id IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'ok', FALSE,
      'error', 'Reward already claimed or pending',
      'status', 409
    );
  END IF;

  INSERT INTO public.rewards_claim_table (
    user_id,
    rewards_claim_payment_method,
    rewards_claim_account_details,
    rewards_claim_amount,
    rewards_claim_status,
    rewards_claim_referral_count
  )
  VALUES (
    input_user_id,
    UPPER(input_payment_method),
    input_account_details,
    default_amount,
    'PENDING',
    referral_cnt
  )
  RETURNING * INTO inserted_claim;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'claim', ROW_TO_JSON(inserted_claim)
  );
END;
$$;

-- RPC: list reward claims for admins
CREATE OR REPLACE FUNCTION admin_list_reward_claims()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result JSON := '[]'::JSON;
BEGIN
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'id', r.rewards_claim_id,
        'user_id', r.user_id,
        'payment_method', r.rewards_claim_payment_method,
        'account_details', r.rewards_claim_account_details,
        'amount', r.rewards_claim_amount,
        'status', r.rewards_claim_status,
        'referral_count', r.rewards_claim_referral_count,
        'created_at', r.rewards_claim_created_at,
        'processed_at', r.rewards_claim_processed_at,
        'proof_path', r.rewards_claim_proof_path,
        'user', CASE
          WHEN u.users_id IS NOT NULL THEN JSON_BUILD_OBJECT(
            'id', u.users_id,
            'email', u.users_email,
            'referral_code', u.users_referral_code
          )
          ELSE NULL
        END
      )
      ORDER BY r.rewards_claim_created_at DESC
    ),
    '[]'::JSON
  )
  INTO result
  FROM public.rewards_claim_table r
  LEFT JOIN public.users_table u ON u.users_id = r.user_id;

  RETURN result;
END;
$$;

-- RPC: update reward claim status for admins
CREATE OR REPLACE FUNCTION admin_update_reward_claim(
  input_claim_id UUID,
  input_status TEXT,
  input_proof_path TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  allowed_status CONSTANT TEXT[] := ARRAY['PROCESSING', 'PAID'];
  updated_row public.rewards_claim_table%ROWTYPE;
BEGIN
  IF input_claim_id IS NULL OR input_status IS NULL THEN
    RAISE EXCEPTION 'claim id and status are required';
  END IF;

  IF NOT input_status = ANY(allowed_status) THEN
    RAISE EXCEPTION 'Invalid status %', input_status;
  END IF;

  UPDATE public.rewards_claim_table
  SET
    rewards_claim_status = input_status::public.rewards_claim_status,
    rewards_claim_processed_at = CASE
      WHEN input_status = 'PAID' THEN NOW()
      ELSE rewards_claim_processed_at
    END,
    rewards_claim_proof_path = COALESCE(input_proof_path, rewards_claim_proof_path)
  WHERE rewards_claim_id = input_claim_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'claim', JSON_BUILD_OBJECT(
      'id', updated_row.rewards_claim_id,
      'user_id', updated_row.user_id,
      'payment_method', updated_row.rewards_claim_payment_method,
      'account_details', updated_row.rewards_claim_account_details,
      'amount', updated_row.rewards_claim_amount,
      'status', updated_row.rewards_claim_status,
      'referral_count', updated_row.rewards_claim_referral_count,
      'created_at', updated_row.rewards_claim_created_at,
      'processed_at', updated_row.rewards_claim_processed_at,
      'proof_path', updated_row.rewards_claim_proof_path
    )
  );
END;
$$;
