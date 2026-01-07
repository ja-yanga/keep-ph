-- Migration to add referral_reward_milestone_claimed to users_table
-- and implement the recurring claim_referral_rewards RPC function.

-- 1. Add the column to track claimed milestones
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users_table' AND COLUMN_NAME = 'referral_reward_milestone_claimed') THEN
        ALTER TABLE users_table ADD COLUMN referral_reward_milestone_claimed INT DEFAULT 0;
    END IF;
END $$;

-- 2. Create the RPC function to claim rewards
CREATE OR REPLACE FUNCTION public.claim_referral_rewards(
    input_user_id UUID,
    input_payment_method TEXT,
    input_account_details TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_referrals INT;
    v_claimed_milestones INT;
    v_eligible_milestones INT;
    v_claimable_count INT;
    v_reward_amount INT;
    v_new_milestone_count INT;
    v_result JSONB;
BEGIN
    -- Get current user stats
    -- Count from referral_table where this user is the referrer
    SELECT COUNT(*) INTO v_total_referrals
    FROM public.referral_table
    WHERE referral_referrer_user_id = input_user_id;

    -- Get already claimed milestones
    SELECT referral_reward_milestone_claimed INTO v_claimed_milestones
    FROM users_table
    WHERE users_id = input_user_id;

    -- Calculate eligibility
    v_eligible_milestones := FLOOR(v_total_referrals / 10);
    v_claimable_count := v_eligible_milestones - v_claimed_milestones;

    IF v_claimable_count <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No rewards currently claimable',
            'payout', 0
        );
    END IF;

    v_reward_amount := v_claimable_count * 500;
    v_new_milestone_count := v_claimed_milestones + v_claimable_count;

    -- Update user table (atomic)
    UPDATE users_table
    SET referral_reward_milestone_claimed = v_new_milestone_count
    WHERE users_id = input_user_id;

    -- Insert into rewards_claim_table for history and audit
    INSERT INTO public.rewards_claim_table (
        user_id,
        rewards_claim_payment_method,
        rewards_claim_account_details,
        rewards_claim_amount,
        rewards_claim_status,
        rewards_claim_referral_count
    ) VALUES (
        input_user_id,
        input_payment_method, -- Use actual payment method
        input_account_details, -- Use actual account details
        v_reward_amount,
        'PENDING', -- Set to PENDING so admin can process it
        v_total_referrals
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Rewards claimed successfully',
        'payout', v_reward_amount,
        'milestones_claimed', v_claimable_count,
        'total_claimed_milestones', v_new_milestone_count
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM,
        'payout', 0
    );
END;
$$;

-- 3. Update get_rewards_status RPC to support recurring logic
CREATE OR REPLACE FUNCTION get_rewards_status(input_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_referrals INT;
    v_claimed_milestones INT;
    v_eligible_milestones INT;
    v_claimable_count INT;
    v_referral_code TEXT;
BEGIN
    SELECT users_referral_code, referral_reward_milestone_claimed 
    INTO v_referral_code, v_claimed_milestones
    FROM users_table 
    WHERE users_id = input_user_id;

    SELECT COUNT(*) INTO v_total_referrals
    FROM public.referral_table
    WHERE referral_referrer_user_id = input_user_id;

    v_eligible_milestones := FLOOR(v_total_referrals / 10);
    v_claimable_count := v_eligible_milestones - v_claimed_milestones;

    RETURN jsonb_build_object(
        'threshold', 10,
        'amount_per_milestone', 500,
        'referralCount', v_total_referrals,
        'eligibleMilestones', v_eligible_milestones,
        'claimedMilestones', v_claimed_milestones,
        'claimableCount', v_claimable_count,
        'eligible', v_claimable_count > 0
    );
END;
$$;
