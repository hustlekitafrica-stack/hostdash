-- Migration 36: Platform payments table + pesapal_order_id on profiles
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS platform_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pesapal_order_id    TEXT,
  pesapal_tracking_id TEXT,
  amount_usd          NUMERIC(10,2) NOT NULL DEFAULT 45.00,
  currency            TEXT NOT NULL DEFAULT 'USD',
  status              TEXT NOT NULL DEFAULT 'pending',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_payments_user_id
  ON platform_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_platform_payments_pesapal_order_id
  ON platform_payments(pesapal_order_id);

-- RLS
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_payments'
      AND policyname = 'Users can view own payments'
  ) THEN
    CREATE POLICY "Users can view own payments"
      ON platform_payments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_payments'
      AND policyname = 'Service role can manage payments'
  ) THEN
    CREATE POLICY "Service role can manage payments"
      ON platform_payments FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add pesapal_order_id to profiles if not already there
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pesapal_order_id TEXT;
