-- ============================================================================
-- Day of Deception: live game updates, auto missions, player profiles
-- ============================================================================
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run more than once. Only adds things; changes no existing data.

-- 1. Live updates straight from the database.
--    Screens listen to changes on the game state table, so the game keeps
--    moving even when the host's phone is asleep. Only this table is
--    published: live changes carry whole rows, and the players and missions
--    tables would reveal who the Deceivers are. Changes to those tables bump
--    game_state.updated_at instead (see below).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['traitors_day_game_state'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 1b. Any change to a game's players or missions touches its game_state row,
--     which is what screens listen to.
CREATE OR REPLACE FUNCTION dod_touch_game_state() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE traitors_day_game_state
    SET updated_at = NOW()
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS dod_players_touch ON traitors_day_players;
CREATE TRIGGER dod_players_touch
  AFTER INSERT OR UPDATE OR DELETE ON traitors_day_players
  FOR EACH ROW EXECUTE FUNCTION dod_touch_game_state();

DROP TRIGGER IF EXISTS dod_missions_touch ON traitors_day_missions;
CREATE TRIGGER dod_missions_touch
  AFTER INSERT OR UPDATE OR DELETE ON traitors_day_missions
  FOR EACH ROW EXECUTE FUNCTION dod_touch_game_state();

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
