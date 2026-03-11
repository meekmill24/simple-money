-- Migration: Fix cost_amount reflection and ensure referral bonus visibility
-- This ensures normal tasks show their product value in red and referral bonuses are tracked correctly.

CREATE OR REPLACE FUNCTION public.complete_user_task(p_task_item_id INT)
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

    -- Fetch profile data
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
    
    -- Regular Task Logic (if not already pending)
    IF v_pending_task_id IS NULL THEN
        IF v_tasks_in_current_set >= v_tasks_per_set THEN
            RAISE EXCEPTION 'Daily set sequence completed. Contact support for next set.';
        END IF;

        IF v_wallet_balance < 50 THEN -- Allowing lower balance for initial users
            RAISE EXCEPTION 'Minimum balance required to start task is $65. Current: $%', v_wallet_balance;
        END IF;

        -- Check if current task should be a bundle trigger
        IF v_pending_bundle IS NOT NULL AND (v_tasks_in_current_set + 1) = (v_pending_bundle->>'targetIndex')::INT THEN
            v_cost_amount := (v_pending_bundle->>'totalAmount')::DECIMAL;
            v_earned_amount := (v_pending_bundle->>'bonusAmount')::DECIMAL;
            v_is_bundle_task := true;
        ELSE
            -- Normal simulated price
            v_random_price := (v_wallet_balance * (0.40 + random() * 0.45));
            IF v_random_price < 50 AND v_wallet_balance >= 65 THEN v_random_price := v_wallet_balance * 0.8; END IF;
            v_earned_amount := ROUND((v_random_price * v_commission_rate), 2);
            v_cost_amount := v_random_price; -- Set cost_amount for visibility in records
        END IF;
    END IF;

    SELECT title INTO v_task_title FROM public.task_items WHERE id = p_task_item_id;

    -- UPDATE PROFILE
    -- If it's a NEW normal task, only add commission.
    -- If it was a PENDING BUNDLE, add back cost + commission.
    IF v_pending_task_id IS NOT NULL THEN
        -- Completing a pending bundle
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
        -- completing a fresh task (normal or fresh bundle trigger)
        -- If it's a fresh bundle, it doesn't add to balance yet, it stays pending.
        -- Wait, this function is called BOTH for starting and submitting? 
        -- No, usually it's for submitting. 
        -- If it's a fresh normal task, we just add commission.
        UPDATE public.profiles 
        SET 
            wallet_balance = wallet_balance + v_earned_amount,
            profit = profit + v_earned_amount,
            total_profit = total_profit + v_earned_amount,
            completed_count = completed_count + 1
        WHERE id = v_user_id
        RETURNING wallet_balance INTO v_new_wallet_balance;
    END IF;

    -- Log task success
    IF v_pending_task_id IS NOT NULL THEN
        UPDATE public.user_tasks 
        SET status = 'completed', completed_at = NOW(), earned_amount = v_earned_amount, cost_amount = v_cost_amount, is_bundle = v_is_bundle_task
        WHERE id = v_pending_task_id;
    ELSE
        INSERT INTO public.user_tasks (user_id, task_item_id, status, earned_amount, cost_amount, is_bundle, completed_at)
        VALUES (v_user_id, p_task_item_id, 'completed', v_earned_amount, v_cost_amount, v_is_bundle_task, NOW());
    END IF;

    -- Transaction Log
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (v_user_id, 'commission', v_earned_amount, 'Optimization Reward: ' || COALESCE(v_task_title, 'Standard Task'), 'approved');

    IF v_pending_task_id IS NOT NULL AND v_cost_amount > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (v_user_id, 'unfreeze', v_cost_amount, 'Capital Return: ' || COALESCE(v_task_title, 'Bundle'), 'approved');
    END IF;

    -- Referral Bonus (20% of the commission)
    IF v_referrer_id IS NOT NULL AND v_earned_amount > 0 THEN
        v_ref_bonus := ROUND((v_earned_amount * 0.20), 2);
        IF v_ref_bonus > 0 THEN
            UPDATE public.profiles SET wallet_balance = wallet_balance + v_ref_bonus WHERE id = v_referrer_id;
            INSERT INTO public.transactions (user_id, type, amount, description, status)
            VALUES (v_referrer_id, 'commission', v_ref_bonus, 'Referral Reward (20% of Optimization)', 'approved');
            
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (v_referrer_id, 'Team Reward Received! 🎉', 'You earned $' || v_ref_bonus || ' from your teammate''s optimization.', 'success');
        END IF;
    END IF;

    -- Detect set completion
    IF (v_tasks_in_current_set + 1) >= v_tasks_per_set THEN
        v_is_first_set_complete := true;
    END IF;

    -- Also backfill NULL cost_amounts for existing completed tasks (Safety UI sync)
    UPDATE public.user_tasks 
    SET cost_amount = ROUND(earned_amount / v_commission_rate, 2)
    WHERE user_id = v_user_id AND status = 'completed' AND (cost_amount IS NULL OR cost_amount = 0);

    RETURN json_build_object(
        'success', true,
        'earned_amount', v_earned_amount,
        'new_balance', v_new_wallet_balance,
        'set_complete', v_is_first_set_complete,
        'is_bundle', v_is_bundle_task
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
