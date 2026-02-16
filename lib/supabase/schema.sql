-- ============================================================================
-- JEOPARDY GAME APP - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This schema migrates all 8 localStorage structures to Supabase with:
-- - User ownership (user_id foreign keys)
-- - Row Level Security (RLS) for data isolation
-- - Board sharing with view/edit permissions
-- - Migration tracking
-- ============================================================================

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================
-- Supabase Auth handles the auth.users table automatically
-- We extend it with a public profiles table

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GAME SETTINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.game_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'ai')),
  question_timer_seconds INTEGER NOT NULL DEFAULT 45,
  steal_timer_seconds INTEGER NOT NULL DEFAULT 10,
  point_mode TEXT NOT NULL DEFAULT 'classic' CHECK (point_mode IN ('classic', 'flat')),
  flat_point_value INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One settings record per user
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_settings_user ON game_settings(user_id);

-- ============================================================================
-- TEAMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  players TEXT[] NOT NULL DEFAULT '{}',
  power_ups JSONB NOT NULL DEFAULT '{"doubleDown": false, "doubleDip": false, "phoneAFriend": false}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);

-- ============================================================================
-- PLAYER STATS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  questions_incorrect INTEGER NOT NULL DEFAULT 0,
  highest_single_score INTEGER NOT NULL DEFAULT 0,
  lowest_single_score INTEGER NOT NULL DEFAULT 0,
  power_ups_used JSONB NOT NULL DEFAULT '{"doubleDown": 0, "doubleDip": 0, "phoneAFriend": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique player per team per user
  UNIQUE(user_id, player_name, team_id)
);

CREATE INDEX IF NOT EXISTS idx_player_stats_user ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(user_id, player_name);

-- ============================================================================
-- PLAYER ANSWERS (child of player_stats)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.player_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_stat_id UUID REFERENCES player_stats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  category_name TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  power_up_used TEXT,
  game_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_answers_stat ON player_answers(player_stat_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_user ON player_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_timestamp ON player_answers(user_id, timestamp DESC);

-- ============================================================================
-- BOARDS (saved and current)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  board_data JSONB NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_user ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_current ON boards(user_id, is_current) WHERE is_current = true;

-- Only one current board per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_one_current_per_user ON boards(user_id) WHERE is_current = true;

-- ============================================================================
-- BOARD SHARING
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE share_permission AS ENUM ('view', 'edit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.board_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission share_permission NOT NULL DEFAULT 'view',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Can't share same board with same user twice
  UNIQUE(board_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS idx_board_shares_board ON board_shares(board_id);
CREATE INDEX IF NOT EXISTS idx_board_shares_recipient ON board_shares(shared_with_id);
CREATE INDEX IF NOT EXISTS idx_board_shares_email ON board_shares(shared_with_email);

-- ============================================================================
-- CATEGORY LIBRARY
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.category_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  difficulty_guidance TEXT NOT NULL,
  answer_format_guidance TEXT NOT NULL,
  examples TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_library_user ON category_library(user_id);

-- ============================================================================
-- FAVORITE QUESTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.favorite_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  value INTEGER NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate favorites
  UNIQUE(user_id, category_name, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_favorite_questions_user ON favorite_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_questions_saved_at ON favorite_questions(user_id, saved_at DESC);

-- ============================================================================
-- FACT-CHECK CACHE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.factcheck_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('likely_correct', 'uncertain', 'likely_incorrect')),
  confidence NUMERIC(5, 2) NOT NULL,
  explanation TEXT NOT NULL,
  supporting_facts TEXT[] NOT NULL DEFAULT '{}',
  common_confusions TEXT[] DEFAULT '{}',
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Cache key: user + question + answer combo
  UNIQUE(user_id, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_factcheck_cache_user ON factcheck_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_factcheck_cache_expires ON factcheck_cache(expires_at);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_factcheck_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM factcheck_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.migration_status (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  migrated BOOLEAN DEFAULT false,
  migrated_at TIMESTAMPTZ,
  migration_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE factcheck_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, but only update their own
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Game Settings
DROP POLICY IF EXISTS "Users can view own game settings" ON game_settings;
CREATE POLICY "Users can view own game settings" ON game_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own game settings" ON game_settings;
CREATE POLICY "Users can insert own game settings" ON game_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own game settings" ON game_settings;
CREATE POLICY "Users can update own game settings" ON game_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own game settings" ON game_settings;
CREATE POLICY "Users can delete own game settings" ON game_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Teams
DROP POLICY IF EXISTS "Users can view own teams" ON teams;
CREATE POLICY "Users can view own teams" ON teams
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
CREATE POLICY "Users can insert own teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own teams" ON teams;
CREATE POLICY "Users can update own teams" ON teams
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own teams" ON teams;
CREATE POLICY "Users can delete own teams" ON teams
  FOR DELETE USING (auth.uid() = user_id);

-- Player Stats
DROP POLICY IF EXISTS "Users can view own player stats" ON player_stats;
CREATE POLICY "Users can view own player stats" ON player_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player stats" ON player_stats;
CREATE POLICY "Users can insert own player stats" ON player_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own player stats" ON player_stats;
CREATE POLICY "Users can update own player stats" ON player_stats
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own player stats" ON player_stats;
CREATE POLICY "Users can delete own player stats" ON player_stats
  FOR DELETE USING (auth.uid() = user_id);

-- Player Answers
DROP POLICY IF EXISTS "Users can view own player answers" ON player_answers;
CREATE POLICY "Users can view own player answers" ON player_answers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own player answers" ON player_answers;
CREATE POLICY "Users can insert own player answers" ON player_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own player answers" ON player_answers;
CREATE POLICY "Users can delete own player answers" ON player_answers
  FOR DELETE USING (auth.uid() = user_id);

-- Boards: Users can see own boards + shared boards
DROP POLICY IF EXISTS "Users can view own boards" ON boards;
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view shared boards" ON boards;
CREATE POLICY "Users can view shared boards" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_shares
      WHERE board_shares.board_id = boards.id
      AND (board_shares.shared_with_id = auth.uid() OR board_shares.shared_with_email = auth.email())
    )
  );

DROP POLICY IF EXISTS "Users can insert own boards" ON boards;
CREATE POLICY "Users can insert own boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boards" ON boards;
CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update shared boards with edit permission" ON boards;
CREATE POLICY "Users can update shared boards with edit permission" ON boards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM board_shares
      WHERE board_shares.board_id = boards.id
      AND (board_shares.shared_with_id = auth.uid() OR board_shares.shared_with_email = auth.email())
      AND board_shares.permission = 'edit'
    )
  );

DROP POLICY IF EXISTS "Users can delete own boards" ON boards;
CREATE POLICY "Users can delete own boards" ON boards
  FOR DELETE USING (auth.uid() = user_id);

-- Board Shares
DROP POLICY IF EXISTS "Users can view shares they created" ON board_shares;
CREATE POLICY "Users can view shares they created" ON board_shares
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view shares they received" ON board_shares;
CREATE POLICY "Users can view shares they received" ON board_shares
  FOR SELECT USING (auth.uid() = shared_with_id OR shared_with_email = auth.email());

DROP POLICY IF EXISTS "Users can create shares for own boards" ON board_shares;
CREATE POLICY "Users can create shares for own boards" ON board_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own shares" ON board_shares;
CREATE POLICY "Users can update own shares" ON board_shares
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own shares" ON board_shares;
CREATE POLICY "Users can delete own shares" ON board_shares
  FOR DELETE USING (auth.uid() = owner_id);

-- Category Library
DROP POLICY IF EXISTS "Users can view own categories" ON category_library;
CREATE POLICY "Users can view own categories" ON category_library
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON category_library;
CREATE POLICY "Users can insert own categories" ON category_library
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON category_library;
CREATE POLICY "Users can update own categories" ON category_library
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON category_library;
CREATE POLICY "Users can delete own categories" ON category_library
  FOR DELETE USING (auth.uid() = user_id);

-- Favorite Questions
DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_questions;
CREATE POLICY "Users can view own favorites" ON favorite_questions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorite_questions;
CREATE POLICY "Users can insert own favorites" ON favorite_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorite_questions;
CREATE POLICY "Users can delete own favorites" ON favorite_questions
  FOR DELETE USING (auth.uid() = user_id);

-- Fact-check Cache
DROP POLICY IF EXISTS "Users can view own factcheck cache" ON factcheck_cache;
CREATE POLICY "Users can view own factcheck cache" ON factcheck_cache
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own factcheck cache" ON factcheck_cache;
CREATE POLICY "Users can insert own factcheck cache" ON factcheck_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own factcheck cache" ON factcheck_cache;
CREATE POLICY "Users can update own factcheck cache" ON factcheck_cache
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own factcheck cache" ON factcheck_cache;
CREATE POLICY "Users can delete own factcheck cache" ON factcheck_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Migration Status
DROP POLICY IF EXISTS "Users can view own migration status" ON migration_status;
CREATE POLICY "Users can view own migration status" ON migration_status
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own migration status" ON migration_status;
CREATE POLICY "Users can insert own migration status" ON migration_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own migration status" ON migration_status;
CREATE POLICY "Users can update own migration status" ON migration_status
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get boards accessible to a user (own + shared)
CREATE OR REPLACE FUNCTION get_accessible_boards(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  board_data JSONB,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  is_owner BOOLEAN,
  permission share_permission
) AS $$
BEGIN
  RETURN QUERY
  -- Own boards
  SELECT
    b.id,
    b.user_id,
    b.name,
    b.board_data,
    b.is_current,
    b.created_at,
    b.updated_at,
    true AS is_owner,
    'edit'::share_permission AS permission
  FROM boards b
  WHERE b.user_id = p_user_id

  UNION ALL

  -- Shared boards
  SELECT
    b.id,
    b.user_id,
    b.name,
    b.board_data,
    false AS is_current,
    b.created_at,
    b.updated_at,
    false AS is_owner,
    bs.permission
  FROM boards b
  JOIN board_shares bs ON bs.board_id = b.id
  WHERE (bs.shared_with_id = p_user_id OR bs.shared_with_email = (SELECT email FROM auth.users WHERE id = p_user_id))

  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update board shares when user signs up (match email to user_id)
CREATE OR REPLACE FUNCTION update_board_shares_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE board_shares
  SET shared_with_id = NEW.id
  WHERE shared_with_email = NEW.email AND shared_with_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_signup_update_shares ON auth.users;
CREATE TRIGGER on_user_signup_update_shares
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION update_board_shares_on_signup();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '   - 11 tables created with RLS enabled';
  RAISE NOTICE '   - All policies configured';
  RAISE NOTICE '   - Helper functions and triggers added';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next steps:';
  RAISE NOTICE '   1. Add NEXT_PUBLIC_SUPABASE_URL to .env.local';
  RAISE NOTICE '   2. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local';
  RAISE NOTICE '   3. Proceed to Phase 2: Authentication Setup';
END $$;
