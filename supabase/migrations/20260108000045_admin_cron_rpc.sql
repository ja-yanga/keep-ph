CREATE OR REPLACE FUNCTION admin_process_expired_subscriptions(input_now_iso TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  var_expired_count INTEGER := 0;
  var_renewed_count INTEGER := 0;
  var_lockers_freed INTEGER := 0;
  var_to_expire_regs UUID[] := '{}';
  var_locker_ids UUID[] := '{}';
  var_sub RECORD;
  var_months INTEGER;
  var_expires_at TIMESTAMPTZ;
  return_data JSONB;
BEGIN
  -- 1. Identify subscriptions that are already expired or expire exactly now
  FOR var_sub IN 
    SELECT 
      subscription_id, 
      mailroom_registration_id, 
      subscription_auto_renew, 
      subscription_billing_cycle
    FROM public.subscription_table
    WHERE subscription_expires_at <= input_now_iso
  LOOP
    IF var_sub.subscription_auto_renew THEN
      -- Handle Auto-Renewal
      var_months := CASE 
        WHEN UPPER(var_sub.subscription_billing_cycle) = 'QUARTERLY' THEN 3
        WHEN UPPER(var_sub.subscription_billing_cycle) = 'ANNUAL' THEN 12
        ELSE 1
      END;
      
      var_expires_at := input_now_iso + (var_months || ' month')::INTERVAL;
      
      UPDATE public.subscription_table
      SET 
        subscription_started_at = input_now_iso,
        subscription_expires_at = var_expires_at,
        subscription_updated_at = input_now_iso
      WHERE subscription_id = var_sub.subscription_id;
      
      var_renewed_count := var_renewed_count + 1;
    ELSE
      -- Handle Expiration
      var_to_expire_regs := array_append(var_to_expire_regs, var_sub.mailroom_registration_id);
      var_expired_count := var_expired_count + 1;
    END IF;
  END LOOP;

  -- 2. Process Expirations (Status update, assignment deletion, locker freeing)
  IF array_length(var_to_expire_regs, 1) > 0 THEN
    -- Update registration status
    UPDATE public.mailroom_registration_table
    SET mailroom_registration_status = FALSE
    WHERE mailroom_registration_id = ANY(var_to_expire_regs);

    -- Identify locker IDs to free
    SELECT array_agg(location_locker_id) INTO var_locker_ids
    FROM public.mailroom_assigned_locker_table
    WHERE mailroom_registration_id = ANY(var_to_expire_regs)
    AND location_locker_id IS NOT NULL;

    -- Delete assignments
    DELETE FROM public.mailroom_assigned_locker_table
    WHERE mailroom_registration_id = ANY(var_to_expire_regs);

    -- Free lockers
    IF array_length(var_locker_ids, 1) > 0 THEN
      UPDATE public.location_locker_table
      SET location_locker_is_available = TRUE
      WHERE location_locker_id = ANY(var_locker_ids);
      
      var_lockers_freed := array_length(var_locker_ids, 1);
    END IF;
  END IF;

  return_data := JSONB_BUILD_OBJECT(
    'success', TRUE,
    'expired_count', var_expired_count,
    'renewed_count', var_renewed_count,
    'lockers_freed', var_lockers_freed,
    'message', FORMAT('Processed: expired=%s, renewed=%s, lockers_freed=%s', var_expired_count, var_renewed_count, var_lockers_freed)
  );

  RETURN return_data;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_process_expired_subscriptions(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_process_expired_subscriptions(TIMESTAMPTZ) TO service_role;
