-- ============================================================================
-- CLASSIC JEOPARDY LIVE - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- LIVE GAME SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby'
    CHECK (status IN ('lobby', 'active', 'paused', 'finished', 'cancelled')),

  -- Board data (snapshot at game start)
  board_data JSONB,
  double_jeopardy_board JSONB,
  final_jeopardy JSONB,

  -- Game configuration
  enable_double_jeopardy BOOLEAN DEFAULT false,
  buzzer_lockout_ms INTEGER DEFAULT 250,
  clue_timer_seconds INTEGER DEFAULT 30,
  final_timer_seconds INTEGER DEFAULT 30,
  wager_timer_seconds INTEGER DEFAULT 60,
  max_players INTEGER DEFAULT 12,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON live_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_join_code ON live_sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);

-- ============================================================================
-- LIVE PLAYERS (anonymous guests, NOT auth users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  is_connected BOOLEAN DEFAULT true,

  -- Final Jeopardy data
  final_wager INTEGER,
  final_answer_drawing TEXT,
  final_answer_text TEXT,
  final_correct BOOLEAN,

  -- Stats
  correct_count INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  buzz_count INTEGER DEFAULT 0,

  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, display_name)
);

CREATE INDEX IF NOT EXISTS idx_live_players_session ON live_players(session_id);

-- ============================================================================
-- LIVE GAME STATE (authoritative server state)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.live_game_state (
  session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE PRIMARY KEY,

  -- Current phase
  phase TEXT NOT NULL DEFAULT 'lobby'
    CHECK (phase IN (
      'lobby',
      'round_intro',
      'board_select',
      'clue_display',
      'buzzer_open',
      'answer_check',
      'daily_double_wager',
      'daily_double_answer',
      'final_category',
      'final_wager',
      'final_clue',
      'final_draw',
      'final_locked',
      'final_reveal',
      'game_over'
    )),

  -- Round tracking
  current_round INTEGER NOT NULL DEFAULT 1,

  -- Current clue context
  current_category_index INTEGER,
  current_clue_index INTEGER,
  current_clue_value INTEGER,

  -- Clue state
  clues_revealed JSONB DEFAULT '[]'::JSONB,
  daily_doubles JSONB DEFAULT '[]'::JSONB,

  -- Buzzer state
  buzzer_queue JSONB DEFAULT '[]'::JSONB,
  current_answerer_id UUID,
  buzzer_locked BOOLEAN DEFAULT true,

  -- Timer
  timer_started_at TIMESTAMPTZ,
  timer_duration_seconds INTEGER,
  timer_paused_at TIMESTAMPTZ,

  -- Final Jeopardy
  final_reveal_index INTEGER DEFAULT 0,
  final_reveal_order JSONB DEFAULT '[]'::JSONB,

  -- Metadata
  last_action TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_game_state ENABLE ROW LEVEL SECURITY;

-- Sessions: Host can do everything
DROP POLICY IF EXISTS "Host can manage own sessions" ON live_sessions;
CREATE POLICY "Host can manage own sessions" ON live_sessions
  FOR ALL USING (auth.uid() = host_id);

-- Sessions: Anyone can read (needed for join flow)
DROP POLICY IF EXISTS "Anyone can read sessions" ON live_sessions;
CREATE POLICY "Anyone can read sessions" ON live_sessions
  FOR SELECT USING (true);

-- Players: Host can manage all players in their sessions
DROP POLICY IF EXISTS "Host can manage players" ON live_players;
CREATE POLICY "Host can manage players" ON live_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_players.session_id
      AND live_sessions.host_id = auth.uid()
    )
  );

-- Players: Anyone can read players (for lobby display)
DROP POLICY IF EXISTS "Anyone can read players" ON live_players;
CREATE POLICY "Anyone can read players" ON live_players
  FOR SELECT USING (true);

-- Players: Anyone can insert (anonymous join via API)
DROP POLICY IF EXISTS "Anyone can join as player" ON live_players;
CREATE POLICY "Anyone can join as player" ON live_players
  FOR INSERT WITH CHECK (true);

-- Players: Anyone can update their own record (for wager/drawing submission)
DROP POLICY IF EXISTS "Anyone can update players" ON live_players;
CREATE POLICY "Anyone can update players" ON live_players
  FOR UPDATE USING (true);

-- Game state: Host can manage
DROP POLICY IF EXISTS "Host can manage game state" ON live_game_state;
CREATE POLICY "Host can manage game state" ON live_game_state
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM live_sessions
      WHERE live_sessions.id = live_game_state.session_id
      AND live_sessions.host_id = auth.uid()
    )
  );

-- Game state: Anyone can read
DROP POLICY IF EXISTS "Anyone can read game state" ON live_game_state;
CREATE POLICY "Anyone can read game state" ON live_game_state
  FOR SELECT USING (true);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_live_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS live_sessions_updated ON live_sessions;
CREATE TRIGGER live_sessions_updated
  BEFORE UPDATE ON live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_live_session_timestamp();

DROP TRIGGER IF EXISTS live_game_state_updated ON live_game_state;
CREATE TRIGGER live_game_state_updated
  BEFORE UPDATE ON live_game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_live_session_timestamp();
