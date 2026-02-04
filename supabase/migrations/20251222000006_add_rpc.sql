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
        'total_referrals', COALESCE(r.rewards_claim_total_referrals, r.rewards_claim_referral_count),
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

-- Rewards status RPC consolidates referral count + claims metadata
CREATE OR REPLACE FUNCTION public.get_user_kyc_by_user_id(input_user_id UUID)
RETURNS public.user_kyc_table
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result public.user_kyc_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO result
  FROM public.user_kyc_table
  WHERE user_id = input_user_id
  LIMIT 1;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_verified(input_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  status_text TEXT;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT user_kyc_status
  INTO status_text
  FROM public.user_kyc_table
  WHERE user_id = input_user_id
  LIMIT 1;

  RETURN status_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_user_kyc(
  input_search TEXT DEFAULT '',
  input_limit INTEGER DEFAULT 500,
  input_offset INTEGER DEFAULT 0,
  input_status TEXT DEFAULT NULL,
  input_sort_by TEXT DEFAULT 'created_at',
  input_sort_order TEXT DEFAULT 'DESC'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sanitized_limit INTEGER := LEAST(GREATEST(COALESCE(input_limit, 1), 1), 1000);
  sanitized_offset INTEGER := GREATEST(COALESCE(input_offset, 0), 0);
  search_term TEXT := COALESCE(input_search, '');
  status_term TEXT := NULLIF(UPPER(COALESCE(input_status, '')), '');
  sort_by_term TEXT := COALESCE(input_sort_by, 'created_at');
  sort_order_term TEXT := UPPER(COALESCE(input_sort_order, 'DESC'));
  final_data JSON := '[]'::JSON;
  total_count INTEGER;
BEGIN
  -- total count
  SELECT COUNT(*)
  INTO total_count
  FROM public.user_kyc_table uk
  WHERE
    (status_term IS NULL OR UPPER(uk.user_kyc_status::text) = status_term)
    AND (
      search_term = ''
      OR uk.user_kyc_first_name ILIKE '%' || search_term || '%'
      OR uk.user_kyc_last_name ILIKE '%' || search_term || '%'
    );

  WITH base AS (
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

      addr.user_kyc_address_line_one    AS addr_line1,
      addr.user_kyc_address_line_two    AS addr_line2,
      addr.user_kyc_address_city        AS addr_city,
      addr.user_kyc_address_region      AS addr_region,
      addr.user_kyc_address_postal_code AS addr_postal

    FROM public.user_kyc_table uk
    LEFT JOIN LATERAL (
      SELECT *
      FROM public.user_kyc_address_table a
      WHERE a.user_kyc_id = uk.user_kyc_id
      ORDER BY uk.user_kyc_created_at DESC
      LIMIT 1
    ) addr ON TRUE
    WHERE
      (status_term IS NULL OR UPPER(uk.user_kyc_status::text) = status_term)
      AND (
        search_term = ''
        OR uk.user_kyc_first_name ILIKE '%' || search_term || '%'
        OR uk.user_kyc_last_name ILIKE '%' || search_term || '%'
      )
    ORDER BY
      -- String sorting
      CASE WHEN sort_order_term = 'ASC' THEN
        CASE
          WHEN sort_by_term = 'user' THEN uk.user_kyc_first_name
          WHEN sort_by_term = 'doc' THEN uk.user_kyc_id_document_type
          WHEN sort_by_term = 'status' THEN uk.user_kyc_status::text
          ELSE NULL
        END
      END ASC,
      CASE WHEN sort_order_term = 'DESC' THEN
        CASE
          WHEN sort_by_term = 'user' THEN uk.user_kyc_first_name
          WHEN sort_by_term = 'doc' THEN uk.user_kyc_id_document_type
          WHEN sort_by_term = 'status' THEN uk.user_kyc_status::text
          ELSE NULL
        END
      END DESC,
      -- Timestamp sorting
      CASE WHEN sort_order_term = 'ASC' THEN
        CASE
          WHEN sort_by_term = 'submitted_at' THEN uk.user_kyc_submitted_at
          WHEN sort_by_term = 'verified_at' THEN uk.user_kyc_verified_at
          WHEN sort_by_term = 'created_at' THEN uk.user_kyc_created_at
          ELSE NULL
        END
      END ASC NULLS LAST,
      CASE WHEN sort_order_term = 'DESC' THEN
        CASE
          WHEN sort_by_term = 'submitted_at' THEN uk.user_kyc_submitted_at
          WHEN sort_by_term = 'verified_at' THEN uk.user_kyc_verified_at
          WHEN sort_by_term = 'created_at' THEN uk.user_kyc_created_at
          ELSE NULL
        END
      END DESC NULLS LAST,
      -- Default fallback
      uk.user_kyc_created_at DESC
    LIMIT sanitized_limit
    OFFSET sanitized_offset
  )
  SELECT COALESCE(
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'user_kyc_id', user_kyc_id,
        'user_id', user_id,
        'user_kyc_status', user_kyc_status,
        'user_kyc_id_document_type', user_kyc_id_document_type,
        'user_kyc_id_number', user_kyc_id_number,
        'user_kyc_id_front_url', user_kyc_id_front_url,
        'user_kyc_id_back_url', user_kyc_id_back_url,
        'user_kyc_first_name', user_kyc_first_name,
        'user_kyc_last_name', user_kyc_last_name,
        'user_kyc_submitted_at', user_kyc_submitted_at,
        'user_kyc_verified_at', user_kyc_verified_at,
        'user_kyc_created_at', user_kyc_created_at,
        'user_kyc_updated_at', user_kyc_updated_at,
        'address',
          CASE
            WHEN addr_line1 IS NULL
             AND addr_line2 IS NULL
             AND addr_city IS NULL
             AND addr_region IS NULL
             AND addr_postal IS NULL
            THEN NULL
            ELSE JSON_BUILD_OBJECT(
              'line1', addr_line1,
              'line2', addr_line2,
              'city', addr_city,
              'region', addr_region,
              'postal', addr_postal
            )
          END
      )
    ),
    '[]'::JSON
  )
  INTO final_data
  FROM base;

  RETURN JSON_BUILD_OBJECT(
    'data', final_data,
    'total_count', total_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_kyc(
  input_user_id UUID,
  input_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  normalized_status TEXT;
  updated_row public.user_kyc_table%ROWTYPE;
BEGIN
  IF input_user_id IS NULL THEN
    RAISE EXCEPTION 'input_user_id is required';
  END IF;

  normalized_status := UPPER(COALESCE(input_status, ''));

  IF normalized_status NOT IN ('VERIFIED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid status %', normalized_status;
  END IF;

  UPDATE public.user_kyc_table
  SET
    user_kyc_status = normalized_status::public.user_kyc_status,
    user_kyc_updated_at = NOW(),
    user_kyc_verified_at = CASE
      WHEN normalized_status = 'VERIFIED' THEN NOW()
      ELSE user_kyc_verified_at
    END
  WHERE user_id = input_user_id
  RETURNING * INTO updated_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User KYC not found';
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'ok', TRUE,
    'data', ROW_TO_JSON(updated_row)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(input_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  role_text TEXT;
BEGIN
  IF input_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT users_role
  INTO role_text
  FROM public.users_table
  WHERE users_id = input_user_id
  LIMIT 1;

  RETURN role_text;
END;
$$;

