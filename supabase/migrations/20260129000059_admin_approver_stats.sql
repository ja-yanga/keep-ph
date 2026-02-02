CREATE OR REPLACE FUNCTION public.admin_approver_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats_json jsonb := '{}'::jsonb;
  kyc_json jsonb;
  rewards_json jsonb;
  kyc_count int := 0;
  rewards_count int := 0;
BEGIN
  -- dashboard stats RPC (if exists)
  BEGIN
    stats_json := COALESCE(admin_dashboard_stats()::jsonb, '{}'::jsonb);
  EXCEPTION WHEN undefined_function THEN
    stats_json := '{}'::jsonb;
  END;

  -- kyc summary using admin_list_user_kyc RPC (status SUBMITTED)
  BEGIN
    kyc_json := COALESCE(admin_list_user_kyc('', 1, 0, 'SUBMITTED')::jsonb, '{}'::jsonb);
    IF kyc_json ? 'total_count' THEN
      kyc_count := (kyc_json ->> 'total_count')::int;
    ELSE
      kyc_count := 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    kyc_count := 0;
  END;

  -- rewards: count PENDING or PROCESSING from admin_list_reward_claims RPC
  BEGIN
    rewards_json := COALESCE(admin_list_reward_claims()::jsonb, '[]'::jsonb);

    IF jsonb_typeof(rewards_json) = 'array' THEN
      rewards_count := (
        SELECT count(*) FROM jsonb_array_elements(rewards_json) elem
        WHERE upper(coalesce(elem->> 'status', '')) IN ('PENDING','PROCESSING')
      );
    ELSIF rewards_json ? 'data' THEN
      rewards_count := (
        SELECT count(*) FROM jsonb_array_elements(rewards_json -> 'data') elem
        WHERE upper(coalesce(elem->> 'status', '')) IN ('PENDING','PROCESSING')
      );
    ELSE
      rewards_count := 0;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    rewards_count := 0;
  END;

  RETURN jsonb_build_object(
    'stats', stats_json,
    'kyc_pending_count', kyc_count,
    'rewards_pending_count', rewards_count
  );
END;
$$;