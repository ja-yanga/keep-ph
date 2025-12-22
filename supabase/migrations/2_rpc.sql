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
  FROM referral_table
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
  FROM rewards_claim_table
  WHERE user_id = input_user_id;

  SELECT EXISTS (
    SELECT 1
    FROM rewards_claim_table
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
