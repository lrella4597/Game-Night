-- ============================================================================
-- THE TRAITORS - Database Schema
-- ============================================================================

-- ============================================================================
-- TRAITORS SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traitors_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby'
    CHECK (status IN ('lobby', 'active', 'finished', 'cancelled')),

  -- Game configuration
  traitor_count INTEGER NOT NULL DEFAULT 2,
  night_timer_seconds INTEGER DEFAULT 60,
  discussion_timer_seconds INTEGER DEFAULT 120,
  vote_timer_seconds INTEGER DEFAULT 60,
  reveal_role_on_elimination BOOLEAN DEFAULT true,
  max_players INTEGER DEFAULT 20,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_traitors_sessions_host ON traitors_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_traitors_sessions_join_code ON traitors_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_traitors_sessions_status ON traitors_sessions(status);

-- ============================================================================
-- TRAITORS PLAYERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traitors_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES traitors_sessions(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT true,

  -- Role: assigned server-side. NEVER sent via broadcast.
  role TEXT CHECK (role IN ('traitor', 'faithful')),

  -- Status
  is_alive BOOLEAN DEFAULT true,
  eliminated_by TEXT CHECK (eliminated_by IN ('murder', 'banish')),
  eliminated_in_round INTEGER,

  -- Voting state (reset each round)
  night_vote_target_id UUID,
  day_vote_target_id UUID,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, display_name)
);

CREATE INDEX IF NOT EXISTS idx_traitors_players_session ON traitors_players(session_id);

-- ============================================================================
-- TRAITORS GAME STATE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traitors_game_state (
  session_id UUID REFERENCES traitors_sessions(id) ON DELETE CASCADE PRIMARY KEY,

  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN (
      'lobby',
      'role_reveal',
      'night',
      'night_result',
      'day_discussion',
      'day_vote',
      'vote_result',
      'endgame'
    )),

  current_round INTEGER NOT NULL DEFAULT 0,

  -- Night phase tracking
  night_target_id UUID,
  night_votes_locked BOOLEAN DEFAULT false,

  -- Day vote tracking
  day_banish_target_id UUID,
  day_votes_locked BOOLEAN DEFAULT false,
  day_vote_tally JSONB DEFAULT '{}'::JSONB,

  -- Timer
  timer_started_at TIMESTAMPTZ,
  timer_duration_seconds INTEGER,

  -- Endgame
  winner TEXT CHECK (winner IN ('faithful', 'traitors')),

  -- Metadata
  last_action TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE traitors_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_game_state ENABLE ROW LEVEL SECURITY;

-- Sessions
CREATE POLICY "Host can manage own traitors sessions" ON traitors_sessions
  FOR ALL USING (auth.uid() = host_id);
CREATE POLICY "Anyone can read traitors sessions" ON traitors_sessions
  FOR SELECT USING (true);

-- Players
CREATE POLICY "Host can manage traitors players" ON traitors_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM traitors_sessions
      WHERE traitors_sessions.id = traitors_players.session_id
      AND traitors_sessions.host_id = auth.uid()
    )
  );
CREATE POLICY "Anyone can read traitors players" ON traitors_players
  FOR SELECT USING (true);
CREATE POLICY "Anyone can join as traitors player" ON traitors_players
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own traitors player" ON traitors_players
  FOR UPDATE USING (true);

-- Game state
CREATE POLICY "Host can manage traitors game state" ON traitors_game_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM traitors_sessions
      WHERE traitors_sessions.id = traitors_game_state.session_id
      AND traitors_sessions.host_id = auth.uid()
    )
  );
CREATE POLICY "Anyone can read traitors game state" ON traitors_game_state
  FOR SELECT USING (true);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_traitors_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER traitors_sessions_updated
  BEFORE UPDATE ON traitors_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_traitors_timestamp();

CREATE TRIGGER traitors_game_state_updated
  BEFORE UPDATE ON traitors_game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_traitors_timestamp();
