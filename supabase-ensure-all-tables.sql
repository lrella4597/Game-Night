-- ============================================================================
-- ENSURE ALL TABLES EXIST - Safe to run multiple times
-- ============================================================================
-- This creates any tables that are missing from your Supabase database.
-- Uses IF NOT EXISTS so it won't break anything that already exists.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Teams
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own teams" ON teams;
  DROP POLICY IF EXISTS "Users can insert own teams" ON teams;
  DROP POLICY IF EXISTS "Users can update own teams" ON teams;
  DROP POLICY IF EXISTS "Users can delete own teams" ON teams;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own teams" ON teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own teams" ON teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own teams" ON teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own teams" ON teams FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Player Stats
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  UNIQUE(user_id, player_name, team_id)
);

CREATE INDEX IF NOT EXISTS idx_player_stats_user ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(user_id, player_name);

ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own player stats" ON player_stats;
  DROP POLICY IF EXISTS "Users can insert own player stats" ON player_stats;
  DROP POLICY IF EXISTS "Users can update own player stats" ON player_stats;
  DROP POLICY IF EXISTS "Users can delete own player stats" ON player_stats;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own player stats" ON player_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own player stats" ON player_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own player stats" ON player_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own player stats" ON player_stats FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Player Answers
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own player answers" ON player_answers;
  DROP POLICY IF EXISTS "Users can insert own player answers" ON player_answers;
  DROP POLICY IF EXISTS "Users can delete own player answers" ON player_answers;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own player answers" ON player_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own player answers" ON player_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own player answers" ON player_answers FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Favorite Questions
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.favorite_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  value INTEGER NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_name, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_favorite_questions_user ON favorite_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_questions_saved_at ON favorite_questions(user_id, saved_at DESC);

ALTER TABLE favorite_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own favorites" ON favorite_questions;
  DROP POLICY IF EXISTS "Users can insert own favorites" ON favorite_questions;
  DROP POLICY IF EXISTS "Users can delete own favorites" ON favorite_questions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own favorites" ON favorite_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorite_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorite_questions FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Factcheck Cache
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  UNIQUE(user_id, question, answer)
);

CREATE INDEX IF NOT EXISTS idx_factcheck_cache_user ON factcheck_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_factcheck_cache_expires ON factcheck_cache(expires_at);

ALTER TABLE factcheck_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own factcheck cache" ON factcheck_cache;
  DROP POLICY IF EXISTS "Users can insert own factcheck cache" ON factcheck_cache;
  DROP POLICY IF EXISTS "Users can update own factcheck cache" ON factcheck_cache;
  DROP POLICY IF EXISTS "Users can delete own factcheck cache" ON factcheck_cache;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own factcheck cache" ON factcheck_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own factcheck cache" ON factcheck_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own factcheck cache" ON factcheck_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own factcheck cache" ON factcheck_cache FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Migration Status
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.migration_status (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  migrated BOOLEAN DEFAULT false,
  migrated_at TIMESTAMPTZ,
  migration_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own migration status" ON migration_status;
  DROP POLICY IF EXISTS "Users can insert own migration status" ON migration_status;
  DROP POLICY IF EXISTS "Users can update own migration status" ON migration_status;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own migration status" ON migration_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own migration status" ON migration_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own migration status" ON migration_status FOR UPDATE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Done!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'All core tables verified/created:';
  RAISE NOTICE '  - teams';
  RAISE NOTICE '  - player_stats';
  RAISE NOTICE '  - player_answers';
  RAISE NOTICE '  - favorite_questions';
  RAISE NOTICE '  - factcheck_cache';
  RAISE NOTICE '  - migration_status';
  RAISE NOTICE 'RLS policies applied to all tables.';
END $$;
