-- ============================================================================
-- Traitors (Day of Deception): show-style ending, multiple rounds, murder
-- ============================================================================
-- * Players can be out of the game: banished at a Roundtable or murdered.
-- * The reveal runs in steps like the show: everyone shows their vote
--   (chalkboards), the banished player is named, then THEY reveal their role.
-- * Several Roundtables per game, until every Traitor is out or the Traitors
--   match the Faithful.
-- * The Traitors can murder a Faithful player once the host opens it, in
--   plain sight: the app gives them an action to do to the victim.
-- * Rounds like the show: murder in plain sight, breakfast reveal, the day,
--   then a Roundtable. One murder per round.
-- * Event rewards: private clue, shield-or-team-clue, a double vote, or a
--   truth check. Traitors also earn a double vote every 3 missions.
-- * Recruitment after a Traitor is banished, the
--   endgame vote, and a log of the whole game for the recap at the end.
-- * Two lengths: one day (about 3 Roundtables) or a weekend (about 2 a day,
--   paused overnight).
-- * Event winners can face a choice: take the shield (safe until the next
--   Roundtable is over) or give everyone a real clue.
--
-- Run in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

ALTER TABLE traitors_day_players
  ADD COLUMN IF NOT EXISTS eliminated TEXT CHECK (eliminated IN ('banished', 'murdered')),
  ADD COLUMN IF NOT EXISTS eliminated_at TIMESTAMPTZ,
  -- Can't be banished or murdered until the next Roundtable is over
  ADD COLUMN IF NOT EXISTS shield BOOLEAN NOT NULL DEFAULT FALSE,
  -- Won an event and still has to choose: shield, or a clue for everyone
  ADD COLUMN IF NOT EXISTS pending_choice TEXT,
  -- Breakfast: the round this player checked in for
  ADD COLUMN IF NOT EXISTS breakfast_round INTEGER,
  -- Double votes (won in events, or every 3 missions for Traitors). Armed =
  -- use one at the next Roundtable. vote_doubled marks it on the vote reveal.
  ADD COLUMN IF NOT EXISTS daggers INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dagger_armed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vote_doubled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Truth checks won in events: pick two players, learn if a Traitor is among them
  ADD COLUMN IF NOT EXISTS truth_checks INTEGER NOT NULL DEFAULT 0,
  -- The Traitors have offered this player a place
  ADD COLUMN IF NOT EXISTS recruit_offer BOOLEAN NOT NULL DEFAULT FALSE,
  -- Endgame: end | banish
  ADD COLUMN IF NOT EXISTS endgame_vote TEXT;

ALTER TABLE traitors_day_game_state
  -- boards | banished | role | tie | endgame
  ADD COLUMN IF NOT EXISTS reveal_step TEXT,
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1,
  -- null | open (Traitors doing it) | chosen (done, not announced) | breakfast (checking in) | done
  ADD COLUMN IF NOT EXISTS murder_status TEXT,
  ADD COLUMN IF NOT EXISTS murder_victim_id UUID REFERENCES traitors_day_players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS murders_done INTEGER NOT NULL DEFAULT 0,
  -- How the Traitors have to do it ("toss them an apple"), and who did it
  ADD COLUMN IF NOT EXISTS murder_method TEXT,
  ADD COLUMN IF NOT EXISTS murder_by_id UUID REFERENCES traitors_day_players(id) ON DELETE SET NULL,
  -- The round the last murder was opened in (one per round)
  ADD COLUMN IF NOT EXISTS murder_round INTEGER,
  -- null | open (Traitors choosing) | offered (waiting on the answer) | done
  ADD COLUMN IF NOT EXISTS recruit_status TEXT,
  ADD COLUMN IF NOT EXISTS recruit_target_id UUID REFERENCES traitors_day_players(id) ON DELETE SET NULL;

-- One day or a weekend, and the overnight pause (Good night / Good morning)
ALTER TABLE traitors_day_sessions
  ADD COLUMN IF NOT EXISTS game_length TEXT NOT NULL DEFAULT 'day' CHECK (game_length IN ('day', 'weekend')),
  ADD COLUMN IF NOT EXISTS missions_paused BOOLEAN NOT NULL DEFAULT FALSE;

-- Everything that happened, for the recap at the end
CREATE TABLE IF NOT EXISTS traitors_day_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES traitors_day_sessions(id) ON DELETE CASCADE,
  round_number INTEGER,
  text TEXT NOT NULL,
  -- Spoilers until the game ends
  secret BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS traitors_day_log_session_idx ON traitors_day_log (session_id, created_at);
-- Only the server reads and writes it
ALTER TABLE traitors_day_log ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
