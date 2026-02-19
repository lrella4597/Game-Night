-- ============================================================================
-- Traitors: Day of Deception — Schema
-- ============================================================================

-- 1. Sessions
CREATE TABLE traitors_day_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id),
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'finished', 'cancelled')),

  -- Config
  traitor_count INTEGER NOT NULL DEFAULT 2,
  mission_cadence TEXT NOT NULL DEFAULT 'manual' CHECK (mission_cadence IN ('manual', '30', '45', '60')),
  number_of_events INTEGER NOT NULL DEFAULT 2,
  discussion_timer_minutes INTEGER NOT NULL DEFAULT 10,
  voting_timer_seconds INTEGER NOT NULL DEFAULT 120,
  reveal_roles_at_end BOOLEAN NOT NULL DEFAULT TRUE,
  show_admin_role_panel BOOLEAN NOT NULL DEFAULT FALSE,
  max_token_vote_bonus INTEGER NOT NULL DEFAULT 3,
  max_players INTEGER NOT NULL DEFAULT 30,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- 2. Players
CREATE TABLE traitors_day_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES traitors_day_sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#ef4444',
  is_connected BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT CHECK (role IN ('traitor', 'faithful')),
  shadow_tokens INTEGER NOT NULL DEFAULT 0,
  vote_target_id UUID REFERENCES traitors_day_players(id),
  vote_locked BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (session_id, display_name)
);

-- 3. Game State (one row per session)
CREATE TABLE traitors_day_game_state (
  session_id UUID PRIMARY KEY REFERENCES traitors_day_sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'lobby' CHECK (phase IN ('lobby', 'roles_revealed', 'freeplay', 'event_active', 'roundtable', 'voting', 'reveal', 'end')),

  -- Event tracking
  current_event_index INTEGER NOT NULL DEFAULT 0,
  current_event_template TEXT,
  event_started_at TIMESTAMPTZ,
  event_duration_seconds INTEGER,

  -- Mission tracking
  missions_sent_count INTEGER NOT NULL DEFAULT 0,

  -- Vote resolution
  vote_tally JSONB,
  accused_player_id UUID REFERENCES traitors_day_players(id),
  winner TEXT CHECK (winner IN ('faithful', 'traitors')),
  roles_revealed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timer
  timer_started_at TIMESTAMPTZ,
  timer_duration_seconds INTEGER,

  last_action TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Missions
CREATE TABLE traitors_day_missions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES traitors_day_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES traitors_day_players(id) ON DELETE CASCADE,
  mission_text TEXT NOT NULL,
  mission_category TEXT NOT NULL DEFAULT 'social',
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_proof TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE traitors_day_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE traitors_day_missions ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can read, only host can insert/update
CREATE POLICY "Anyone can read traitors_day_sessions" ON traitors_day_sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create traitors_day_sessions" ON traitors_day_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update traitors_day_sessions" ON traitors_day_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Host can delete traitors_day_sessions" ON traitors_day_sessions FOR DELETE USING (auth.uid() = host_id);

-- Players: anyone can read, anyone can insert (join), host can update/delete
CREATE POLICY "Anyone can read traitors_day_players" ON traitors_day_players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert traitors_day_players" ON traitors_day_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update traitors_day_players" ON traitors_day_players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete traitors_day_players" ON traitors_day_players FOR DELETE USING (true);

-- Game State: anyone can read, host can modify
CREATE POLICY "Anyone can read traitors_day_game_state" ON traitors_day_game_state FOR SELECT USING (true);
CREATE POLICY "Anyone can insert traitors_day_game_state" ON traitors_day_game_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update traitors_day_game_state" ON traitors_day_game_state FOR UPDATE USING (true);

-- Missions: anyone can read, anyone can insert/update
CREATE POLICY "Anyone can read traitors_day_missions" ON traitors_day_missions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert traitors_day_missions" ON traitors_day_missions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update traitors_day_missions" ON traitors_day_missions FOR UPDATE USING (true);
