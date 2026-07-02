-- Channel Manager tables (iCal bidirectional sync)
-- Run this in Supabase SQL Editor after 32_menu_items_image.sql

-- ============================================================================
-- NEW TABLE: channel_connections
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  display_name TEXT,
  ical_import_url TEXT NOT NULL,
  export_token TEXT UNIQUE NOT NULL,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  sync_error TEXT,
  events_imported INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channel_connections_user_id ON channel_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_property_id ON channel_connections(property_id);
CREATE INDEX IF NOT EXISTS idx_channel_connections_export_token ON channel_connections(export_token);

-- ============================================================================
-- EXTEND blocked_dates
-- ============================================================================
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS source_channel TEXT;
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS external_uid TEXT;
ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS channel_connection_id UUID REFERENCES channel_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_dates_external_uid_property_id ON blocked_dates(external_uid, property_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_channel_connection_id ON blocked_dates(channel_connection_id);

-- ============================================================================
-- RLS POLICIES FOR channel_connections
-- ============================================================================
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own channel connections" ON channel_connections;
CREATE POLICY "Users can view own channel connections"
  ON channel_connections FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own channel connections" ON channel_connections;
CREATE POLICY "Users can insert own channel connections"
  ON channel_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own channel connections" ON channel_connections;
CREATE POLICY "Users can update own channel connections"
  ON channel_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own channel connections" ON channel_connections;
CREATE POLICY "Users can delete own channel connections"
  ON channel_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can sync all channels (for background cron job)
DROP POLICY IF EXISTS "Service role can sync all channels" ON channel_connections;
CREATE POLICY "Service role can sync all channels"
  ON channel_connections FOR ALL
  USING (auth.role() = 'service_role');
