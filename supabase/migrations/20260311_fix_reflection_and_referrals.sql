-- Migration: Full Referral & Record Logic Fix
-- 1. Ensure the schema has necessary columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_earned DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false;

-- 2. Clean up previous function signatures to avoid "Function Not Found" issues
DROP FUNCTION IF EXISTS public.complete_user_task(INT);
DROP FUNCTION IF EXISTS public.complete_user_task(INT, DECIMAL);

-- 3. Update the main task completion function
CREATE OR REPLACE FUNCTION public.complete_user_task(
    p_task_item_id INT, 
    p_cost_amount DECIMAL(12,2) DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    v_user_id UUID;
    v_level_id INT;
    v_completed_count INT;
    v_current_set INT;
    v_tasks_per_set INT;
    v_sets_per_day INT;
    v_commission_rate DECIMAL(5,4);
    v_wallet_balance DECIMAL(12,2);
    v_frozen_amount DECIMAL(12,2);
    v_profit DECIMAL(12,2);
    v_total_profit DECIMAL(12,2);
    v_last_reset_at TIMESTAMPTZ;
    v_task_base_offset INT := 0;
    v_tasks_in_current_set INT;
    v_earned_amount DECIMAL(10,2);
    v_random_price DECIMAL(12,2);
    v_referrer_id UUID;
    v_ref_bonus DECIMAL(10,2);
    v_task_title TEXT;
    v_levels_record RECORD;
    v_new_wallet_balance DECIMAL(12,2);
    v_is_first_set_complete BOOLEAN := false;
    v_pending_bundle JSONB;
    v_is_bundle_task BOOLEAN := false;
    v_pending_task_id INT;
    v_cost_amount DECIMAL(12,2) := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Fetch profile data (including new referral_earned field)
    SELECT 
        COALESCE(p.level_id, 1), COALESCE(p.completed_count, 0), COALESCE(p.current_set, 1), 
        COALESCE(p.wallet_balance, 0.00), COALESCE(p.frozen_amount, 0.00), 
        COALESCE(p.profit, 0.00), COALESCE(p.total_profit, 0.00),
        p.referred_by, COALESCE(p.last_reset_at, NOW()), p.pending_bundle
    INTO 
        v_level_id, v_completed_count, v_current_set, 
        v_wallet_balance, v_frozen_amount, v_profit, v_total_profit,
        v_referrer_id, v_last_reset_at, v_pending_bundle
    FROM public.profiles p
    WHERE p.id = v_user_id;

    -- 24 HOUR RESET LOGIC
    IF NOW() - v_last_reset_at >= INTERVAL '24 hours' THEN
        v_profit := 0;
        v_current_set := 1;
        v_last_reset_at := NOW();
        UPDATE public.profiles SET profit = 0, current_set = 1, last_reset_at = v_last_reset_at WHERE id = v_user_id;
    END IF;

    -- Check for existing pending task (Bundle Scenario)
    SELECT id, earned_amount, cost_amount, is_bundle 
    INTO v_pending_task_id, v_earned_amount, v_cost_amount, v_is_bundle_task
    FROM public.user_tasks 
    WHERE user_id = v_user_id AND task_item_id = p_task_item_id AND status = 'pending'
    LIMIT 1;

    -- Get level limits
    SELECT tasks_per_set, sets_per_day, commission_rate
    INTO v_tasks_per_set, v_sets_per_day, v_commission_rate
    FROM public.levels WHERE id = v_level_id;

    IF v_tasks_per_set IS NULL THEN
        v_tasks_per_set := 40; v_sets_per_day := 3; v_commission_rate := 0.0045;
    END IF;

    -- Calculate current progress
    FOR v_levels_record IN SELECT id, tasks_per_set, sets_per_day FROM public.levels ORDER BY price ASC LOOP
        IF v_levels_record.id = v_level_id THEN EXIT; END IF;
        v_task_base_offset := v_task_base_offset + (COALESCE(v_levels_record.sets_per_day, 3) * COALESCE(v_levels_record.tasks_per_set, 40));
    END LOOP;

    v_tasks_in_current_set := v_completed_count - v_task_base_offset - ((v_current_set - 1) * v_tasks_per_set);
    
    -- Processing Logic
    IF v_pending_task_id IS NOT NULL THEN
        v_is_bundle_task := true;
    ELSIF v_pending_bundle IS NOT NULL AND (v_tasks_in_current_set + 1) = (v_pending_bundle->>'targetIndex')::INT THEN
        v_cost_amount := (v_pending_bundle->>'totalAmount')::DECIMAL;
        v_earned_amount := (v_pending_bundle->>'bonusAmount')::DECIMAL;
        v_is_bundle_task := true;
    ELSE
        IF v_tasks_in_current_set >= v_tasks_per_set THEN
            RAISE EXCEPTION 'Daily set sequence completed. Contact support for next set.';
        END IF;

        IF v_wallet_balance < 50 THEN
            RAISE EXCEPTION 'Minimum balance required to start task is $65.';
        END IF;

        -- SYNC: Use provided amount or generate internal
        IF p_cost_amount IS NOT NULL AND p_cost_amount > 20 THEN
            v_cost_amount := p_cost_amount;
        ELSE
            v_random_price := (v_wallet_balance * (0.40 + random() * 0.45));
            IF v_random_price < 50 AND v_wallet_balance >= 65 THEN v_random_price := v_wallet_balance * 0.8; END IF;
            v_cost_amount := v_random_price;
        END IF;
        
        v_earned_amount := ROUND((v_cost_amount * v_commission_rate), 2);
    END IF;

    SELECT title INTO v_task_title FROM public.task_items WHERE id = p_task_item_id;

    -- UPDATE USER PROFILE
    IF v_pending_task_id IS NOT NULL THEN
        UPDATE public.profiles 
        SET 
            wallet_balance = wallet_balance + v_cost_amount + v_earned_amount,
            profit = profit + v_earned_amount,
            total_profit = total_profit + v_earned_amount,
            frozen_amount = GREATEST(0, frozen_amount - (v_cost_amount + v_earned_amount)),
            pending_bundle = NULL
        WHERE id = v_user_id
        RETURNING wallet_balance INTO v_new_wallet_balance;
    ELSE
        UPDATE public.profiles 
        SET 
            wallet_balance = wallet_balance + v_earned_amount,
            profit = profit + v_earned_amount,
            total_profit = total_profit + v_earned_amount,
            completed_count = completed_count + 1,
            pending_bundle = CASE WHEN v_is_bundle_task THEN NULL ELSE pending_bundle END
        WHERE id = v_user_id
        RETURNING wallet_balance INTO v_new_wallet_balance;
    END IF;

    -- LOG TASK RECORD (Ensuring cost_amount is always saved)
    IF v_pending_task_id IS NOT NULL THEN
        UPDATE public.user_tasks 
        SET status = 'completed', completed_at = NOW(), earned_amount = v_earned_amount, cost_amount = v_cost_amount, is_bundle = v_is_bundle_task
        WHERE id = v_pending_task_id;
    ELSE
        INSERT INTO public.user_tasks (user_id, task_item_id, status, earned_amount, cost_amount, is_bundle, completed_at)
        VALUES (v_user_id, p_task_item_id, 'completed', v_earned_amount, v_cost_amount, v_is_bundle_task, NOW());
    END IF;

    -- TRANSACTIONS
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (v_user_id, 'commission', v_earned_amount, 'Optimization Reward: ' || COALESCE(v_task_title, 'Standard Task'), 'approved');

    IF v_pending_task_id IS NOT NULL AND v_cost_amount > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (v_user_id, 'unfreeze', v_cost_amount, 'Capital Return: ' || COALESCE(v_task_title, 'Bundle'), 'approved');
    END IF;

    -- 20% INSTANT REFERRAL BONUS (WITH ADMIN VISIBILITY SYNC)
    IF v_referrer_id IS NOT NULL AND v_earned_amount > 0 THEN
        v_ref_bonus := ROUND((v_earned_amount * 0.20), 2);
        
        IF v_ref_bonus > 0 THEN
            UPDATE public.profiles 
            SET 
                wallet_balance = wallet_balance + v_ref_bonus,
                referral_earned = COALESCE(referral_earned, 0) + v_ref_bonus
            WHERE id = v_referrer_id;

            -- Description MUST contain "Referral" for Admin dashboards to count it correctly
            INSERT INTO public.transactions (user_id, type, amount, description, status)
            VALUES (v_referrer_id, 'commission', v_ref_bonus, 'Optimization Team Referral Bonus (20%)', 'approved');
            
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (v_referrer_id, 'Bonus Received! 🎉', 'Earned $' || v_ref_bonus || ' from teammate optimization.', 'success');
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'earned_amount', v_earned_amount,
        'new_balance', v_new_wallet_balance,
        'set_complete', (v_tasks_in_current_set + 1 >= v_tasks_per_set),
        'is_bundle', v_is_bundle_task,
        'cost_amount', v_cost_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
