-- Run this in your Supabase SQL Editor
-- Add wallet addresses setting to site_settings

-- 1. Create site_settings table if it doesn't exist (it should, but safety first)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert the wallet addresses setting
INSERT INTO site_settings (key, value, description)
VALUES (
  'wallet_addresses',
  '{
    "trx": "TRx9mK2pQbN7cVh3dJwXeGfLkAoYsUP5rI8",
    "bep20": "TRx9mK2pQbN7cVh3dJwXeGfLkAoYsUP5rI8",
    "erc20": "TRx9mK2pQbN7cVh3dJwXeGfLkAoYsUP5rI8",
    "btc": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
  }'::jsonb,
  'Cryptocurrency wallet addresses for deposits'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value 
WHERE site_settings.value IS NULL; -- Only insert if not already there or update if needed
