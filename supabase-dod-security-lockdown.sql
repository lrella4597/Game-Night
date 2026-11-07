-- ============================================================================
-- Day of Deception: security lockdown
-- ============================================================================
-- Before: anyone with the site's public key could read every player's role,
-- every mission, everyone's notification addresses, and could edit or delete
-- players and game state. A curious player could look up who the Deceivers are.
--
-- After:
--   * Only a game's HOST can read its sessions, players and missions directly.
--   * Game state (phase, timers) stays readable so screens get live updates.
--   * Only the host can change game state or remove players.
--   * Notification subscriptions are server-only.
--   * Everything players do goes through the app's server, which uses the
--     service role key (SUPABASE_SERVICE_ROLE_KEY in Netlify).
--
-- ONLY RUN THIS AFTER SUPABASE_SERVICE_ROLE_KEY is set in Netlify and the
-- site has been redeployed, or players won't be able to join or play.
-- Run in Supabase: SQL Editor > New query > paste > Run.

-- Helper: is the signed-in user the host of this game?
CREATE OR REPLACE FUNCTION dod_is_host(sid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM traitors_day_sessions WHERE id = sid AND host_id = auth.uid()
  );
$$;

-- Remove every existing policy on these tables (older migrations used
-- different names), then add the new ones below.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'traitors_day_sessions', 'traitors_day_players', 'traitors_day_game_state',
        'traitors_day_missions', 'push_subscriptions'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE traitors_day_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Sessions: host only
CREATE POLICY "dod sessions host read" ON traitors_day_sessions
  FOR SELECT USING (host_id = auth.uid());
CREATE POLICY "dod sessions host insert" ON traitors_day_sessions
  FOR INSERT WITH CHECK (host_id = auth.uid());
CREATE POLICY "dod sessions host update" ON traitors_day_sessions
  FOR UPDATE USING (host_id = auth.uid());
CREATE POLICY "dod sessions host delete" ON traitors_day_sessions
  FOR DELETE USING (host_id = auth.uid());

-- Players: host only (players get their own data through the server)
CREATE POLICY "dod players host read" ON traitors_day_players
  FOR SELECT USING (dod_is_host(session_id));
CREATE POLICY "dod players host update" ON traitors_day_players
  FOR UPDATE USING (dod_is_host(session_id));
CREATE POLICY "dod players host delete" ON traitors_day_players
  FOR DELETE USING (dod_is_host(session_id));

-- Game state: anyone can read (live updates; holds no secrets), host changes
CREATE POLICY "dod game state read" ON traitors_day_game_state
  FOR SELECT USING (true);
CREATE POLICY "dod game state host insert" ON traitors_day_game_state
  FOR INSERT WITH CHECK (dod_is_host(session_id));
CREATE POLICY "dod game state host update" ON traitors_day_game_state
  FOR UPDATE USING (dod_is_host(session_id));

-- Missions: host can read; created and completed through the server
CREATE POLICY "dod missions host read" ON traitors_day_missions
  FOR SELECT USING (dod_is_host(session_id));

-- push_subscriptions: no policies = server only

NOTIFY pgrst, 'reload schema';
