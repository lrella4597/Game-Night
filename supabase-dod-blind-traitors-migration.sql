-- ============================================================================
-- Traitors: setting for whether the Traitors know who each other are
-- ============================================================================
-- On (default): Traitors see their fellow Traitors, like the show.
-- Off: each Traitor only knows their own role.
--
-- Run in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

ALTER TABLE traitors_day_sessions
  ADD COLUMN IF NOT EXISTS traitors_know_each_other BOOLEAN NOT NULL DEFAULT TRUE;

NOTIFY pgrst, 'reload schema';
