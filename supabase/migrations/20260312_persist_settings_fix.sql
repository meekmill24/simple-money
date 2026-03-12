-- Migration: Add Missing Columns and Fix Referral Logic
-- 1. Add missing columns to profiles
-- notifications_enabled: For persisting user preference across devices
-- wallet_network: For better tracking of multiple crypto networks (BTC, ETH, TRC20, etc.)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notifications_enabled') THEN
    ALTER TABLE public.profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_network') THEN
    ALTER TABLE public.profiles ADD COLUMN wallet_network TEXT DEFAULT 'USDT-TRC20';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'language') THEN
    ALTER TABLE public.profiles ADD COLUMN language TEXT DEFAULT 'English';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'currency') THEN
    ALTER TABLE public.profiles ADD COLUMN currency TEXT DEFAULT 'USDT';
  END IF;
END $$;

-- 2. Update handle_new_user to be robust with case-insensitive referral updates
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
        wallet_balance, profit, total_profit, frozen_amount, last_reset_at,
        notifications_enabled, language, currency
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
        NOW(),
        true,
        'English',
        'USDT'
      );

      -- B. Create internal referral record
      INSERT INTO public.referral_codes (code, owner_id, is_active)
      VALUES (new_referral_code, NEW.id, true);
      
      EXIT;
      
    EXCEPTION WHEN unique_violation THEN
      IF sqlerrm LIKE '%profiles_username_key%' THEN
        v_unique_username := user_username || '_' || substr(md5(random()::text), 1, 3);
      ELSIF sqlerrm LIKE '%referral_codes_code_key%' OR sqlerrm LIKE '%profiles_referral_code_key%' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Signup Integrity Error: %', sqlerrm;
      END IF;
      
      v_retry_count := v_retry_count + 1;
      IF v_retry_count >= 10 THEN
        RAISE EXCEPTION 'Signup failed after maximum retries due to collisions.';
      END IF;
    END;
  END LOOP;

  -- 4. Initial Activation Transaction
  INSERT INTO public.transactions (user_id, type, amount, description, status)
  VALUES (NEW.id, 'deposit', welcome_bonus, 'System Node Activation Bonus ($45)', 'approved');

  -- 5. Increment referrer uses count (Robust Case-Insensitive)
  IF referrer_uuid IS NOT NULL THEN
    UPDATE public.referral_codes
    SET uses_count = uses_count + 1
    WHERE UPPER(code) = UPPER(user_referred_by_code);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
