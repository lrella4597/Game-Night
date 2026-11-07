-- ============================================================================
-- Day of Deception: clues
-- ============================================================================
-- Players earn secret clues about the Deceivers:
--   * Winning an event = a private clue.
--   * After each event, one random player gets an anonymous tip.
--   * A Deceiver who lets a mission expire = a public clue for everyone.
--   * A Deceiver who completes a mission can send one fake anonymous tip.
-- Shadow tokens no longer weight votes; shadow_tokens now just counts
-- completed missions.
--
-- Run in Supabase: SQL Editor > New query > paste > Run.

CREATE TABLE IF NOT EXISTS traitors_day_clues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES traitors_day_sessions(id) ON DELETE CASCADE,
  -- Who sees it
  player_id UUID NOT NULL REFERENCES traitors_day_players(id) ON DELETE CASCADE,
  -- cleared | lineup | mission_tip
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  -- event (won an event) | tip (anonymous tip) | public (missed mission)
  source TEXT NOT NULL,
  source_label TEXT,
  -- Players named in the clue, so the app can pace what's been given away
  subject_ids UUID[] NOT NULL DEFAULT '{}',
  mission_id UUID REFERENCES traitors_day_missions(id) ON DELETE SET NULL,
  -- Fake tips sent by a Deceiver. Never shown to players.
  is_fake BOOLEAN NOT NULL DEFAULT FALSE,
  from_player_id UUID REFERENCES traitors_day_players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS traitors_day_clues_session_idx
  ON traitors_day_clues (session_id, created_at);
CREATE INDEX IF NOT EXISTS traitors_day_clues_player_idx
  ON traitors_day_clues (player_id, created_at);

-- Missions that ran out of time and already released their public clue
ALTER TABLE traitors_day_missions
  ADD COLUMN IF NOT EXISTS expired BOOLEAN NOT NULL DEFAULT FALSE;

-- Only the host can read clues directly. Players get theirs through the server.
ALTER TABLE traitors_day_clues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dod clues host read" ON traitors_day_clues;
CREATE POLICY "dod clues host read" ON traitors_day_clues
  FOR SELECT USING (dod_is_host(session_id));

-- New clue = nudge every screen to refresh
DROP TRIGGER IF EXISTS dod_clues_touch ON traitors_day_clues;
CREATE TRIGGER dod_clues_touch
  AFTER INSERT OR UPDATE OR DELETE ON traitors_day_clues
  FOR EACH ROW EXECUTE FUNCTION dod_touch_game_state();

NOTIFY pgrst, 'reload schema';
