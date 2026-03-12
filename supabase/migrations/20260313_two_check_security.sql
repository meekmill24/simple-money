-- Migration: Enhanced Security Checks for complete_user_task (The "Two Checks")
-- This version fixes the "could not choose best candidate" error and allows pending task submission during deficits.

-- CLEANUP: Drop all possible previous signatures to resolve ambiguity
DROP FUNCTION IF EXISTS public.complete_user_task(INT);
DROP FUNCTION IF EXISTS public.complete_user_task(INT, DECIMAL);
DROP FUNCTION IF EXISTS public.complete_user_task(INT, DECIMAL, DECIMAL);

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
    v_referral_earned DECIMAL(12,2);
    v_last_reset_at TIMESTAMPTZ;
    v_task_base_offset INT := 0;
    v_tasks_in_current_set INT;
    v_earned_amount DECIMAL(10,2);
    v_random_price DECIMAL(10,2);
    v_referrer_id UUID;
    v_ref_bonus DECIMAL(10,2);
    v_task_title TEXT;
    v_levels_record RECORD;
    v_new_wallet_balance DECIMAL(12,2);
    v_is_set_complete BOOLEAN := false;
    v_pending_bundle JSONB;
    v_is_bundle_task BOOLEAN := false;
    v_pending_task_id INT;
    v_cost_amount DECIMAL(12,2) := 0;
    v_level_price DECIMAL(12,2);
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Fetch profile data
    SELECT 
        COALESCE(p.level_id, 1), COALESCE(p.completed_count, 0), COALESCE(p.current_set, 1), 
        COALESCE(p.wallet_balance, 0.00), COALESCE(p.frozen_amount, 0.00), 
        COALESCE(p.profit, 0.00), COALESCE(p.total_profit, 0.00), COALESCE(p.referral_earned, 0.00),
        p.referred_by, COALESCE(p.last_reset_at, NOW()), p.pending_bundle
    INTO 
        v_level_id, v_completed_count, v_current_set, 
        v_wallet_balance, v_frozen_amount, v_profit, v_total_profit, v_referral_earned,
        v_referrer_id, v_last_reset_at, v_pending_bundle
    FROM public.profiles p
    WHERE p.id = v_user_id;

    -- 2. 24 HOUR RESET LOGIC
    IF NOW() - v_last_reset_at >= INTERVAL '24 hours' THEN
        v_profit := 0;
        v_current_set := 1;
        v_last_reset_at := NOW();
        UPDATE public.profiles SET profit = 0, current_set = 1, last_reset_at = v_last_reset_at WHERE id = v_user_id;
    END IF;

    -- 3. CHECK 1: DEFICIT SETTLEMENT (Blocks ALL Submissions including Pending)
    IF v_wallet_balance < 0 THEN
         RAISE EXCEPTION 'Account in deficit. Please settle your balance through the recharge portal or wait for customer service to clear your negative balance to continue.';
    END IF;

    -- 4. CHECK FOR PENDING TASK (Order Submission)
    SELECT id, earned_amount, cost_amount, is_bundle 
    INTO v_pending_task_id, v_earned_amount, v_cost_amount, v_is_bundle_task
    FROM public.user_tasks 
    WHERE user_id = v_user_id AND task_item_id = p_task_item_id AND status = 'pending'
    LIMIT 1;

    -- 5. APPLY SECURITY CHECKS (Only for NEW tasks)
    IF v_pending_task_id IS NULL THEN
        -- Get level data for limits
        SELECT tasks_per_set, sets_per_day, commission_rate, price
        INTO v_tasks_per_set, v_sets_per_day, v_commission_rate, v_level_price
        FROM public.levels WHERE id = v_level_id;

        IF v_tasks_per_set IS NULL THEN
            v_tasks_per_set := 40; v_sets_per_day := 3; v_commission_rate := 0.0045; v_level_price := 65;
        END IF;

        -- CHECK 2: MINIMUM BALANCE REQUIREMENT
        IF v_wallet_balance < v_level_price THEN
            RAISE EXCEPTION 'Insufficient balance to start new task. Minimum required for Level % is $%', v_level_id, v_level_price;
        END IF;

        -- CHECK 3: DAILY SET LIMITS
        IF v_current_set > v_sets_per_day THEN
            RAISE EXCEPTION 'Maximum daily sets ( % / % ) reached. Come back tomorrow!', v_sets_per_day, v_sets_per_day;
        END IF;
        
        -- Duplicate Protection (Same item twice in 24h)
        IF EXISTS (
            SELECT 1 FROM public.user_tasks 
            WHERE user_id = v_user_id 
            AND task_item_id = p_task_item_id 
            AND status = 'completed'
            AND completed_at > v_last_reset_at
        ) THEN
            RAISE EXCEPTION 'Optimization detected duplicate item. Please refresh for a new match.';
        END IF;
    ELSE
        -- If it's a PENDING task, load necessary level info for set completion detection
        SELECT tasks_per_set, sets_per_day, commission_rate
        INTO v_tasks_per_set, v_sets_per_day, v_commission_rate
        FROM public.levels WHERE id = v_level_id;
        
        IF v_tasks_per_set IS NULL THEN
            v_tasks_per_set := 40; v_sets_per_day := 3;
        END IF;
    END IF;

    -- 5. Calculate current set progress
    FOR v_levels_record IN SELECT id, tasks_per_set, sets_per_day FROM public.levels ORDER BY price ASC LOOP
        IF v_levels_record.id = v_level_id THEN EXIT; END IF;
        v_task_base_offset := v_task_base_offset + (COALESCE(v_levels_record.sets_per_day, 3) * COALESCE(v_levels_record.tasks_per_set, 40));
    END LOOP;

    v_tasks_in_current_set := v_completed_count - v_task_base_offset - ((v_current_set - 1) * v_tasks_per_set);
    
    -- 6. TASK CALCULATION (If New)
    IF v_pending_task_id IS NULL THEN
        -- Bundle Trigger Check
        IF v_pending_bundle IS NOT NULL AND (v_tasks_in_current_set + 1) = (v_pending_bundle->>'targetIndex')::INT THEN
            v_cost_amount := (v_pending_bundle->>'totalAmount')::DECIMAL;
            v_earned_amount := (v_pending_bundle->>'bonusAmount')::DECIMAL;
            v_is_bundle_task := true;
        ELSE
            -- Normal simulated price
            IF p_cost_amount IS NOT NULL AND p_cost_amount > 20 THEN
                v_cost_amount := p_cost_amount;
            ELSE
                v_random_price := (v_wallet_balance * (0.40 + random() * 0.45));
                IF v_random_price < 50 AND v_wallet_balance >= 65 THEN v_random_price := v_wallet_balance * 0.8; END IF;
                v_cost_amount := v_random_price;
            END IF;
            v_earned_amount := ROUND((v_cost_amount * v_commission_rate), 2);
            v_is_bundle_task := false;
        END IF;
    END IF;

    SELECT title INTO v_task_title FROM public.task_items WHERE id = p_task_item_id;

    -- 7. UPDATE PROFILE
    -- Release capital + profit
    UPDATE public.profiles 
    SET 
        wallet_balance = wallet_balance + v_cost_amount + v_earned_amount,
        profit = profit + v_earned_amount,
        total_profit = total_profit + v_earned_amount,
        frozen_amount = CASE WHEN v_is_bundle_task OR v_pending_task_id IS NOT NULL THEN GREATEST(0, frozen_amount - (v_cost_amount + v_earned_amount)) ELSE frozen_amount END,
        completed_count = CASE WHEN v_pending_task_id IS NULL THEN completed_count + 1 ELSE completed_count END,
        pending_bundle = CASE WHEN v_is_bundle_task THEN NULL ELSE pending_bundle END
    WHERE id = v_user_id
    RETURNING wallet_balance INTO v_new_wallet_balance;

    -- 8. Log success
    IF v_pending_task_id IS NOT NULL THEN
        UPDATE public.user_tasks 
        SET status = 'completed', completed_at = NOW(), earned_amount = v_earned_amount, cost_amount = v_cost_amount, is_bundle = v_is_bundle_task
        WHERE id = v_pending_task_id;
    ELSE
        INSERT INTO public.user_tasks (user_id, task_item_id, status, earned_amount, cost_amount, is_bundle, completed_at)
        VALUES (v_user_id, p_task_item_id, 'completed', v_earned_amount, v_cost_amount, v_is_bundle_task, NOW());
    END IF;

    -- 9. Transaction Recording
    INSERT INTO public.transactions (user_id, type, amount, description, status)
    VALUES (v_user_id, 'commission', v_earned_amount, 'Optimization Reward: ' || COALESCE(v_task_title, 'Standard Task'), 'approved');

    IF v_cost_amount > 0 THEN
        INSERT INTO public.transactions (user_id, type, amount, description, status)
        VALUES (v_user_id, 'unfreeze', v_cost_amount, 'Capital Return: ' || COALESCE(v_task_title, 'Bundle'), 'approved');
    END IF;

    -- 10. Referral Bonus (20%)
    IF v_referrer_id IS NOT NULL AND v_earned_amount > 0 THEN
        v_ref_bonus := ROUND((v_earned_amount * 0.20), 2);
        IF v_ref_bonus > 0 THEN
            UPDATE public.profiles 
            SET 
                wallet_balance = wallet_balance + v_ref_bonus,
                referral_earned = referral_earned + v_ref_bonus
            WHERE id = v_referrer_id;

            INSERT INTO public.transactions (user_id, type, amount, description, status)
            VALUES (v_referrer_id, 'commission', v_ref_bonus, 'Optimization Team Referral Bonus (20%)', 'approved');

            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (v_referrer_id, 'Bonus Received! 🎉', 'Earned $' || v_ref_bonus || ' from teammate optimization.', 'success');
        END IF;
    END IF;

    -- 11. Set detection
    IF (v_tasks_in_current_set + 1) >= v_tasks_per_set THEN
        v_is_set_complete := true;
    END IF;

    RETURN json_build_object(
        'success', true,
        'earned_amount', v_earned_amount,
        'new_balance', v_new_wallet_balance,
        'set_complete', v_is_set_complete,
        'is_bundle', v_is_bundle_task
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
