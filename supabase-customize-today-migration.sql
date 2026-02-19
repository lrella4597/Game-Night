-- ============================================================================
-- Day of Deception: Add custom pack columns for "Customize Today" feature
-- ============================================================================

ALTER TABLE traitors_day_sessions
  ADD COLUMN IF NOT EXISTS mission_pack JSONB,
  ADD COLUMN IF NOT EXISTS event_pack JSONB,
  ADD COLUMN IF NOT EXISTS context_summary JSONB;
