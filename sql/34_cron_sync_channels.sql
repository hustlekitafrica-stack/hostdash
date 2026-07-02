-- Background sync cron job for channel connections
-- Run this in Supabase SQL Editor after 33_channel_manager.sql
-- Requires pg_cron extension enabled on your Supabase project.

-- ============================================================================
-- 1. Enable pg_cron (Supabase enables it automatically on most projects)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. Schedule the sync job every 20 minutes
-- ============================================================================
-- Replace the URL with your deployed API root.
-- The endpoint must be called with the CRON_SECRET in the Authorization header.
-- If you need to sync every user, the endpoint loops through all active channels.
SELECT cron.schedule(
  'sync-channels',
  '*/20 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://hostdashapp.vercel.app/api/jobs/sync-channels',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.cron_secret', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'
    )
  $$
);

-- ============================================================================
-- 3. Set the CRON_SECRET as a Postgres config variable
-- ============================================================================
-- This is optional and only works if you can store the secret in the database.
-- A more secure option is to store CRON_SECRET in Supabase Vault / Edge Functions.
-- ALTER SYSTEM SET app.cron_secret = 'your-random-secret';
-- NOT RECOMMENDED: uncommenting the above in a managed Supabase environment
-- requires superuser privileges; use Edge Functions or an external cron service instead.

-- ============================================================================
-- 4. Fallback: external cron instructions
-- ============================================================================
-- If pg_cron is not available or cannot reach the public URL, configure an
-- external cron service such as cron-job.org, EasyCron, or Vercel Cron to call:
-- POST https://your-app-url.com/api/jobs/sync-channels
-- Header: Authorization: Bearer <CRON_SECRET>
