-- Admin: Page Views Tracking Table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path TEXT NOT NULL,
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (path, view_date)
);

-- No RLS — only accessible via service role key from admin API
ALTER TABLE page_views DISABLE ROW LEVEL SECURITY;

-- Index for efficient daily queries
CREATE INDEX IF NOT EXISTS page_views_date_idx ON page_views (view_date DESC);
CREATE INDEX IF NOT EXISTS page_views_path_date_idx ON page_views (path, view_date DESC);

-- Atomic upsert function: inserts or increments count
CREATE OR REPLACE FUNCTION upsert_page_view(p_path TEXT, p_date DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO page_views (path, view_date, count)
  VALUES (p_path, p_date, 1)
  ON CONFLICT (path, view_date)
  DO UPDATE SET count = page_views.count + 1;
END;
$$;
