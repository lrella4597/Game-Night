-- ============================================================================
-- Day of Deception: live game updates, auto missions, player profiles
-- ============================================================================
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run more than once. Only adds things; changes no existing data.

-- 1. Live updates straight from the database.
--    Players' and hosts' screens listen to changes on these tables, so the
--    game keeps moving even when the host's phone is asleep.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['traitors_day_game_state', 'traitors_day_players', 'traitors_day_missions'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 2. Automatic missions: fast lookup of the latest mission per game.
CREATE INDEX IF NOT EXISTS traitors_day_missions_session_created_idx
  ON traitors_day_missions (session_id, created_at DESC);

-- 3. "About you" answers players give when they join, used by Customize Today.
ALTER TABLE traitors_day_players
  ADD COLUMN IF NOT EXISTS profile JSONB;

-- 4. Customize Today packs (same as supabase-customize-today-migration.sql;
--    included so this one file covers everything).
ALTER TABLE traitors_day_sessions
  ADD COLUMN IF NOT EXISTS mission_pack JSONB,
  ADD COLUMN IF NOT EXISTS event_pack JSONB,
  ADD COLUMN IF NOT EXISTS context_summary JSONB;

NOTIFY pgrst, 'reload schema';
