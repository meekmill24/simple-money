-- Migration: Fix Registration Trigger & Referral Code Collisions
-- This migration hardens the handle_new_user trigger to handle collisions and case-insensitivity.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_referral_code TEXT;
  user_username TEXT;
  user_phone TEXT;
  user_referred_by_code TEXT;
  referrer_uuid UUID := NULL;
  welcome_bonus NUMERIC := 45.00;
  v_retry_count INT := 0;
  v_unique_username TEXT;
  v_referral_success BOOLEAN := false;
BEGIN
  -- 1. Gather Basic Metadata
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 8));
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_referred_by_code := NEW.raw_user_meta_data->>'referred_by';
  v_unique_username := user_username;
  
  -- 2. Lookup Referrer (Case-Insensitive)
  IF user_referred_by_code IS NOT NULL AND user_referred_by_code != '' AND UPPER(user_referred_by_code) != 'VIP1' THEN
    SELECT owner_id INTO referrer_uuid FROM public.referral_codes WHERE UPPER(code) = UPPER(user_referred_by_code) LIMIT 1;
  END IF;

  -- 3. Collision Protection Loop
  WHILE v_retry_count < 10 LOOP
    BEGIN
      -- Generate a fresh referral code on each attempt
      IF NEW.email = 'amoafop08@gmail.com' THEN
         new_referral_code := '1234';
      ELSE
         new_referral_code := upper(substr(md5(random()::text), 1, 4));
      END IF;

      -- A. Insert Profile
      INSERT INTO public.profiles (
        id, username, phone, email, role, referral_code, referred_by, 
        wallet_balance, profit, total_profit, frozen_amount, last_reset_at
      )
      VALUES (
        NEW.id,
        v_unique_username,
        user_phone,
        NEW.email,
        CASE WHEN NEW.email = 'amoafop08@gmail.com' THEN 'admin' ELSE 'user' END,
        new_referral_code,
        referrer_uuid,
        welcome_bonus,
        0,
        0,
        0,
        NOW()
      );

      -- B. Create internal referral record (this is where 4-char collisions usually happen)
      INSERT INTO public.referral_codes (code, owner_id, is_active)
      VALUES (new_referral_code, NEW.id, true);
      
      -- If all successful, exit loop
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      -- Handle username collision
      IF sqlerrm LIKE '%profiles_username_key%' THEN
        v_unique_username := user_username || '_' || substr(md5(random()::text), 1, 3);
      -- Handle referral code collision (common with 4 chars)
      ELSIF sqlerrm LIKE '%referral_codes_code_key%' OR sqlerrm LIKE '%profiles_referral_code_key%' THEN
        -- Simply let the loop retry with a new code
        NULL;
      ELSE
        -- Unexpected unique violation
        RAISE EXCEPTION 'Signup Integrity Error: %', sqlerrm;
      END IF;
      
      v_retry_count := v_retry_count + 1;
      IF v_retry_count >= 10 THEN
        RAISE EXCEPTION 'Signup failed after maximum retries due to collisions.';
      END IF;
    END;
  END LOOP;

  -- 4. Initial Activation Transaction
  -- Using 'deposit' instead of 'recharge' for maximum compatibility with check constraints
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (NEW.id, 'deposit', welcome_bonus, 'System Node Activation Bonus ($45)', 'approved');

  -- 5. Increment referrer uses count
  IF referrer_uuid IS NOT NULL THEN
    UPDATE public.referral_codes
    SET uses_count = uses_count + 1
    WHERE code = user_referred_by_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
