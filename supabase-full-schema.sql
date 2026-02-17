-- ============================================================================
-- FULL DATABASE SCHEMA - Jeopardy Game App
-- ============================================================================
-- This migration creates all tables needed for user authentication and
-- cloud storage of game data (migrating from localStorage to Supabase).
--
-- Tables created:
-- 1. profiles - User profiles (auto-created on signup)
-- 2. game_settings - Game preferences (timers, point modes, AI settings)
-- 3. teams - Teams with players, scores, power-ups
-- 4. player_stats - Player statistics
-- 5. player_answers - Individual answer history
-- 6. boards - Saved and current game boards
-- 7. board_shares - Board sharing permissions
-- 8. category_library - AI prompt templates for categories
-- 9. favorite_questions - Bookmarked questions
-- 10. factcheck_cache - Cached AI fact-checks (auto-expire after 7 days)
-- 11. migration_status - Track which users have migrated from localStorage
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Profiles Table (User Profiles)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
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
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Game Settings Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Game mode settings
  game_mode TEXT NOT NULL DEFAULT 'teams' CHECK (game_mode IN ('teams', 'individual')),
  point_mode TEXT NOT NULL DEFAULT 'addSubtract' CHECK (point_mode IN ('addSubtract', 'addOnly')),

  -- Timer settings
  answer_timer INTEGER NOT NULL DEFAULT 30,
  timer_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- AI settings
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ai_difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (ai_difficulty IN ('easy', 'medium', 'hard')),

  -- Theme colors (from migration)
  theme_colors JSONB DEFAULT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_settings_user_id ON game_settings(user_id);

ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON game_settings;
CREATE POLICY "Users can view own settings"
  ON game_settings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON game_settings;
CREATE POLICY "Users can insert own settings"
  ON game_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON game_settings;
CREATE POLICY "Users can update own settings"
  ON game_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Teams Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  team_id TEXT NOT NULL, -- Original ID from localStorage
  name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  players TEXT[] DEFAULT '{}',

  -- Power-ups
  double_points_remaining INTEGER DEFAULT 0,
  steal_enabled BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_user_id ON teams(user_id);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own teams" ON teams;
CREATE POLICY "Users can manage own teams"
  ON teams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Player Stats Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  player_name TEXT NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, player_name)
);

CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own player stats" ON player_stats;
CREATE POLICY "Users can manage own player stats"
  ON player_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Player Answers Table (Answer History)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_stat_id UUID NOT NULL REFERENCES player_stats(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  player_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL,
  category TEXT NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_answers_user_id ON player_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player_stat_id ON player_answers(player_stat_id);

ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own player answers" ON player_answers;
CREATE POLICY "Users can manage own player answers"
  ON player_answers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Boards Table (Saved and Current Boards)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  board_data JSONB NOT NULL, -- Full board structure
  is_current BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_boards_is_current ON boards(is_current) WHERE is_current = TRUE;

ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own boards" ON boards;
CREATE POLICY "Users can view own boards"
  ON boards FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own boards" ON boards;
CREATE POLICY "Users can insert own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own boards" ON boards;
CREATE POLICY "Users can update own boards"
  ON boards FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own boards" ON boards;
CREATE POLICY "Users can delete own boards"
  ON boards FOR DELETE
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. Board Shares Table (Sharing Permissions)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS board_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(board_id, shared_with_email)
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='board_shares' AND column_name='shared_with_user_id') THEN
    ALTER TABLE board_shares ADD COLUMN shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_board_shares_board_id ON board_shares(board_id);
CREATE INDEX IF NOT EXISTS idx_board_shares_shared_with_user_id ON board_shares(shared_with_user_id);

ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage shares" ON board_shares;
CREATE POLICY "Owners can manage shares"
  ON board_shares FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Shared users can view shares" ON board_shares;
CREATE POLICY "Shared users can view shares"
  ON board_shares FOR SELECT
  USING (auth.uid() = shared_with_user_id);

-- Function to get accessible boards (own + shared)
DROP FUNCTION IF EXISTS get_accessible_boards(UUID);
CREATE OR REPLACE FUNCTION get_accessible_boards(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  name TEXT,
  board_data JSONB,
  is_current BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  permission TEXT,
  is_owner BOOLEAN
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
    'owner'::TEXT as permission,
    TRUE as is_owner
  FROM boards b
  WHERE b.user_id = p_user_id

  UNION ALL

  -- Shared boards
  SELECT
    b.id,
    b.user_id,
    b.name,
    b.board_data,
    FALSE as is_current, -- Shared boards can't be current
    b.created_at,
    b.updated_at,
    bs.permission,
    FALSE as is_owner
  FROM boards b
  JOIN board_shares bs ON b.id = bs.board_id
  WHERE bs.shared_with_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. Category Library Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS category_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  difficulty_guidance TEXT NOT NULL DEFAULT '',
  answer_format_guidance TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT 'classic' CHECK (origin IN ('classic', 'chat_draft')),
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='category_library' AND column_name='origin') THEN
    ALTER TABLE category_library ADD COLUMN origin TEXT NOT NULL DEFAULT 'classic' CHECK (origin IN ('classic', 'chat_draft'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_category_library_user_id ON category_library(user_id);
CREATE INDEX IF NOT EXISTS idx_category_library_origin ON category_library(origin);

ALTER TABLE category_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own categories" ON category_library;
CREATE POLICY "Users can manage own categories"
  ON category_library FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. Favorite Questions Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS favorite_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  value INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_questions_user_id ON favorite_questions(user_id);

ALTER TABLE favorite_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own favorites" ON favorite_questions;
CREATE POLICY "Users can manage own favorites"
  ON favorite_questions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. Fact-Check Cache Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS factcheck_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,

  -- Cache result
  is_accurate BOOLEAN NOT NULL,
  confidence TEXT NOT NULL,
  explanation TEXT NOT NULL,

  -- Auto-expire after 7 days
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  UNIQUE(user_id, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_factcheck_cache_user_id ON factcheck_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_factcheck_cache_expires_at ON factcheck_cache(expires_at);

ALTER TABLE factcheck_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own factcheck cache" ON factcheck_cache;
CREATE POLICY "Users can manage own factcheck cache"
  ON factcheck_cache FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-delete expired cache entries (runs daily)
CREATE OR REPLACE FUNCTION delete_expired_factcheck_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM factcheck_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. Migration Status Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS migration_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  is_migrated BOOLEAN NOT NULL DEFAULT FALSE,
  migrated_at TIMESTAMPTZ,

  -- Track what was migrated
  items_migrated JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_migration_status_user_id ON migration_status(user_id);

ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own migration status" ON migration_status;
CREATE POLICY "Users can view own migration status"
  ON migration_status FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own migration status" ON migration_status;
CREATE POLICY "Users can insert own migration status"
  ON migration_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own migration status" ON migration_status;
CREATE POLICY "Users can update own migration status"
  ON migration_status FOR UPDATE
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Update Triggers for updated_at columns
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'profiles',
      'game_settings',
      'teams',
      'player_stats',
      'boards',
      'category_library'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
      CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    ', table_name, table_name, table_name, table_name);
  END LOOP;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Success Message
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE '✅ Full database schema migration complete!';
  RAISE NOTICE '📋 Tables created: profiles, game_settings, teams, player_stats, player_answers,';
  RAISE NOTICE '   boards, board_shares, category_library, favorite_questions, factcheck_cache, migration_status';
  RAISE NOTICE '🔒 RLS policies enabled on all tables';
  RAISE NOTICE '⚡ Triggers configured for auto-updates';
  RAISE NOTICE '💡 Ready for Phase 2: Authentication Setup!';
END $$;
