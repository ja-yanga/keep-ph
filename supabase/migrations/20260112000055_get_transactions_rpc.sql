-- RPC Function: Get Transactions with Pagination, Sorting, Filtering, and Search
-- Supports both customer view (filtered by user_id) and admin view (all transactions)
-- Includes pagination, date sorting, user filtering, and search by reference fields

CREATE OR REPLACE FUNCTION get_transactions(
  input_user_ids UUID[] DEFAULT NULL,
  search_query TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'payment_transaction_date',
  sort_dir TEXT DEFAULT 'desc',
  page_limit INTEGER DEFAULT 10,
  page_offset INTEGER DEFAULT 0,
  include_user_details BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  var_transactions JSONB := '[]'::JSONB;
  var_total_count INTEGER := 0;
  var_return_data JSONB;
  var_stats JSONB := '{}'::JSONB;
  var_search_pattern TEXT;
  var_sort_direction TEXT;
  validated_limit INTEGER;
  validated_offset INTEGER;
BEGIN
  -- Validate sort_by parameter (only allow date-related fields)
  IF sort_by NOT IN ('payment_transaction_date', 'payment_transaction_created_at', 'payment_transaction_updated_at') THEN
    sort_by := 'payment_transaction_date';
  END IF;
  
  -- Validate sort_dir parameter
  var_sort_direction := CASE 
    WHEN UPPER(sort_dir) = 'ASC' THEN 'ASC'
    ELSE 'DESC'
  END;
  
  -- Build search pattern for ILIKE (case-insensitive search)
  -- Search in reference_id, reference, and order_id fields
  IF search_query IS NOT NULL AND LENGTH(TRIM(search_query)) > 0 THEN
    var_search_pattern := '%' || TRIM(search_query) || '%';
  ELSE
    var_search_pattern := NULL;
  END IF;
  
  -- Validate pagination parameters
  validated_limit := page_limit;
  IF validated_limit < 1 THEN
    validated_limit := 10;
  END IF;
  IF validated_limit > 100 THEN
    validated_limit := 100; -- Max limit to prevent abuse
  END IF;
  
  validated_offset := page_offset;
  IF validated_offset < 0 THEN
    validated_offset := 0;
  END IF;

  -- Main query with filtering, sorting, and pagination
  -- Optimized: Join user data only after pagination to reduce overhead
  WITH filtered_transactions AS (
    SELECT 
      pt.payment_transaction_id,
      pt.mailroom_registration_id,
      pt.payment_transaction_amount,
      pt.payment_transaction_status,
      pt.payment_transaction_date,
      pt.payment_transaction_method,
      pt.payment_transaction_type,
      pt.payment_transaction_reference_id,
      pt.payment_transaction_channel,
      pt.payment_transaction_reference,
      pt.payment_transaction_order_id,
      pt.payment_transaction_created_at,
      pt.payment_transaction_updated_at,
      -- Only get user_id from mailroom_registration (needed for filtering)
      mr.user_id,
      -- Get mailroom_plan_id for joining plan details later
      mr.mailroom_plan_id
    FROM public.payment_transaction_table pt
    INNER JOIN public.mailroom_registration_table mr 
      ON pt.mailroom_registration_id = mr.mailroom_registration_id
    WHERE 
      -- Filter by user_ids if provided (for customer view or admin filtering specific users)
      -- If input_user_ids is NULL or empty, return all transactions (admin view)
      (
        input_user_ids IS NULL 
        OR array_length(input_user_ids, 1) IS NULL
        OR mr.user_id = ANY(input_user_ids)
      )
      -- Search filter (search in reference fields)
      AND (
        var_search_pattern IS NULL
        OR pt.payment_transaction_reference_id ILIKE var_search_pattern
        OR pt.payment_transaction_reference ILIKE var_search_pattern
        OR pt.payment_transaction_order_id ILIKE var_search_pattern
      )
  ),
  sorted_transactions AS (
    SELECT *
    FROM filtered_transactions
    ORDER BY 
      CASE WHEN sort_by = 'payment_transaction_date' AND var_sort_direction = 'ASC' 
        THEN payment_transaction_date END ASC NULLS LAST,
      CASE WHEN sort_by = 'payment_transaction_date' AND var_sort_direction = 'DESC' 
        THEN payment_transaction_date END DESC NULLS LAST,
      CASE WHEN sort_by = 'payment_transaction_created_at' AND var_sort_direction = 'ASC' 
        THEN payment_transaction_created_at END ASC NULLS LAST,
      CASE WHEN sort_by = 'payment_transaction_created_at' AND var_sort_direction = 'DESC' 
        THEN payment_transaction_created_at END DESC NULLS LAST,
      CASE WHEN sort_by = 'payment_transaction_updated_at' AND var_sort_direction = 'ASC' 
        THEN payment_transaction_updated_at END ASC NULLS LAST,
      CASE WHEN sort_by = 'payment_transaction_updated_at' AND var_sort_direction = 'DESC' 
        THEN payment_transaction_updated_at END DESC NULLS LAST,
      -- Fallback: Always sort by payment_transaction_date DESC as final tiebreaker
      payment_transaction_date DESC NULLS LAST
  ),
  paginated_transactions_base AS (
    SELECT 
      payment_transaction_id,
      mailroom_registration_id,
      payment_transaction_amount,
      payment_transaction_status,
      payment_transaction_date,
      payment_transaction_method,
      payment_transaction_type,
      payment_transaction_reference_id,
      payment_transaction_channel,
      payment_transaction_reference,
      payment_transaction_order_id,
      payment_transaction_created_at,
      payment_transaction_updated_at,
      user_id,
      mailroom_plan_id
    FROM sorted_transactions
    LIMIT validated_limit
    OFFSET validated_offset
  ),
  paginated_transactions AS (
    SELECT 
      ptb.*,
      -- Join user data only when requested and only for paginated results (performance optimization)
      -- Key optimization: User data is joined AFTER pagination, so we only join 10-100 rows instead of thousands
      CASE WHEN include_user_details THEN u.users_email ELSE NULL END AS users_email,
      CASE WHEN include_user_details THEN u.mobile_number ELSE NULL END AS mobile_number,
      CASE WHEN include_user_details THEN 
        TRIM(COALESCE(uk.user_kyc_first_name, '') || ' ' || COALESCE(uk.user_kyc_last_name, ''))
      ELSE NULL END AS user_name,
      -- Join subscription data (one-to-one with mailroom_registration)
      -- Joined after pagination for performance
      s.subscription_id,
      s.subscription_billing_cycle,
      s.subscription_auto_renew,
      s.subscription_started_at,
      s.subscription_expires_at,
      s.subscription_created_at,
      s.subscription_updated_at,
      -- Join mailroom plan data (from mailroom_registration)
      -- Joined after pagination for performance
      -- Note: mailroom_plan_id is already in ptb.*, so we only select plan details
      mp.mailroom_plan_name,
      mp.mailroom_plan_price,
      mp.mailroom_plan_description,
      mp.mailroom_plan_storage_limit,
      mp.mailroom_plan_can_receive_mail,
      mp.mailroom_plan_can_receive_parcels,
      mp.mailroom_plan_can_digitize
    FROM paginated_transactions_base ptb
    -- Conditional joins: Only join when include_user_details is true
    -- PostgreSQL query planner will optimize these joins efficiently
    LEFT JOIN public.users_table u ON include_user_details AND ptb.user_id = u.users_id
    LEFT JOIN public.user_kyc_table uk ON include_user_details AND u.users_id = uk.user_id
    -- Join subscription table (always join, as it's one-to-one and useful for transaction context)
    LEFT JOIN public.subscription_table s ON ptb.mailroom_registration_id = s.mailroom_registration_id
    -- Join mailroom plan table (always join for plan details)
    LEFT JOIN public.mailroom_plan_table mp ON ptb.mailroom_plan_id = mp.mailroom_plan_id
  ),
  total_counts AS (
    SELECT COUNT(*) AS total_count
    FROM filtered_transactions
  ),
  transaction_stats AS (
    SELECT 
      COUNT(*) AS total_transactions,
      COUNT(*) FILTER (
        WHERE LOWER(payment_transaction_status::TEXT) LIKE '%completed%' 
        OR LOWER(payment_transaction_status::TEXT) LIKE '%success%' 
        OR LOWER(payment_transaction_status::TEXT) = 'paid'
      ) AS successful_transactions,
      COALESCE(
        SUM(payment_transaction_amount) FILTER (
          WHERE LOWER(payment_transaction_status::TEXT) LIKE '%completed%' 
          OR LOWER(payment_transaction_status::TEXT) LIKE '%success%' 
          OR LOWER(payment_transaction_status::TEXT) = 'paid'
        ),
        0
      ) AS total_revenue,
      COALESCE(
        AVG(payment_transaction_amount) FILTER (
          WHERE LOWER(payment_transaction_status::TEXT) LIKE '%completed%' 
          OR LOWER(payment_transaction_status::TEXT) LIKE '%success%' 
          OR LOWER(payment_transaction_status::TEXT) = 'paid'
        ),
        0
      ) AS avg_transaction
    FROM filtered_transactions
  ),
  combined_data AS (
    SELECT 
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'payment_transaction_id', payment_transaction_id,
            'mailroom_registration_id', mailroom_registration_id,
            'user_id', user_id,
            'payment_transaction_amount', payment_transaction_amount,
            'payment_transaction_status', payment_transaction_status,
            'payment_transaction_date', payment_transaction_date,
            'payment_transaction_method', payment_transaction_method,
            'payment_transaction_type', payment_transaction_type,
            'payment_transaction_reference_id', payment_transaction_reference_id,
            'payment_transaction_channel', payment_transaction_channel,
            'payment_transaction_reference', payment_transaction_reference,
            'payment_transaction_order_id', payment_transaction_order_id,
            'payment_transaction_created_at', payment_transaction_created_at,
            'payment_transaction_updated_at', payment_transaction_updated_at,
            'user_name', user_name,
            'users_email', users_email,
            'mobile_number', mobile_number,
            'subscription', CASE 
              WHEN subscription_id IS NOT NULL THEN
                JSONB_BUILD_OBJECT(
                  'subscription_id', subscription_id,
                  'subscription_billing_cycle', subscription_billing_cycle,
                  'subscription_auto_renew', subscription_auto_renew,
                  'subscription_started_at', subscription_started_at,
                  'subscription_expires_at', subscription_expires_at,
                  'subscription_created_at', subscription_created_at,
                  'subscription_updated_at', subscription_updated_at
                )
              ELSE NULL
            END,
            'plan', CASE 
              WHEN mailroom_plan_id IS NOT NULL AND mailroom_plan_name IS NOT NULL THEN
                JSONB_BUILD_OBJECT(
                  'mailroom_plan_id', mailroom_plan_id,
                  'mailroom_plan_name', mailroom_plan_name,
                  'mailroom_plan_price', mailroom_plan_price,
                  'mailroom_plan_description', mailroom_plan_description,
                  'mailroom_plan_storage_limit', mailroom_plan_storage_limit,
                  'mailroom_plan_can_receive_mail', mailroom_plan_can_receive_mail,
                  'mailroom_plan_can_receive_parcels', mailroom_plan_can_receive_parcels,
                  'mailroom_plan_can_digitize', mailroom_plan_can_digitize
                )
              ELSE NULL
            END
          )
        ),
        '[]'::JSONB
      ) AS transactions_json
    FROM paginated_transactions pt
  )
  -- Get all data from the combined CTE and stats/total_count independently
  SELECT 
    COALESCE(cd.transactions_json, '[]'::JSONB),
    COALESCE(tc.total_count, 0),
    COALESCE(
      JSONB_BUILD_OBJECT(
        'total_revenue', ts.total_revenue,
        'total_transactions', ts.total_transactions,
        'successful_transactions', ts.successful_transactions,
        'avg_transaction', ts.avg_transaction
      ),
      '{}'::JSONB
    )
  INTO var_transactions, var_total_count, var_stats
  FROM total_counts tc
  CROSS JOIN transaction_stats ts
  LEFT JOIN combined_data cd ON true
  LIMIT 1;

  -- Construct return data with pagination metadata and stats
  var_return_data := JSONB_BUILD_OBJECT(
    'transactions', var_transactions,
    'pagination', JSONB_BUILD_OBJECT(
      'total', var_total_count,
      'limit', validated_limit,
      'offset', validated_offset,
      'has_more', (validated_offset + validated_limit) < var_total_count
    ),
    'stats', var_stats
  );

  RETURN var_return_data;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_transactions(UUID[], TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_transactions(UUID[], TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_transactions(UUID[], TEXT, TEXT, TEXT, INTEGER, INTEGER, BOOLEAN) IS 
'Get payment transactions with pagination, sorting, filtering, and search capabilities.
Supports both customer view (filtered by user_ids) and admin view (all transactions when user_ids is NULL).
Search works across payment_transaction_reference_id, payment_transaction_reference, and payment_transaction_order_id fields.
Sorting supports payment_transaction_date, payment_transaction_created_at, and payment_transaction_updated_at fields.
include_user_details (default: true) controls whether to join users_table and user_kyc_table - set to false for better performance when user data is not needed.
Returns JSONB with transactions array including:
  - Transaction details (amount, status, date, method, type, references, etc.)
  - User details (name, email, mobile_number) when include_user_details=true
  - Subscription details (billing_cycle, auto_renew, started_at, expires_at, etc.)
  - Plan details (name, price, description, storage_limit, capabilities, etc.)
  - Pagination metadata (total, limit, offset, has_more)
  - Statistics (total_revenue, total_transactions, successful_transactions, avg_transaction)
Performance optimized: User, subscription, and plan data are joined only after pagination to minimize query overhead.';
