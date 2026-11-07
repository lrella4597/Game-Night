-- ============================================================================
-- Day of Deception: link players to their sign-in account
-- ============================================================================
-- Players now sign in (Google or email) to join. Each player row records the
-- account that owns it, so:
--   * the same account rejoins its own player on any phone or in the app
--   * nobody else can act as that player
--
-- Safe to run on the live database before the app update ships: it only adds
-- a nullable column and an index. Existing players keep user_id = NULL.
-- Run once in Supabase: SQL Editor > New query > paste > Run.

ALTER TABLE traitors_day_players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- One player per account per game
CREATE UNIQUE INDEX IF NOT EXISTS traitors_day_players_session_user_key
  ON traitors_day_players (session_id, user_id)
  WHERE user_id IS NOT NULL;

-- Fast "which game am I in" lookup
CREATE INDEX IF NOT EXISTS traitors_day_players_user_idx
  ON traitors_day_players (user_id);
