-- ============================================================================
-- Migration: Chat Board Builder - Draft Categories & Board Templates
-- ============================================================================
-- This migration adds tables for the Chat Board Builder feature:
-- 1. draft_categories - Staging area for AI-generated categories
-- 2. board_templates - Full board configurations created via chat
--
-- Run this in your Supabase SQL Editor to enable the Chat Board Builder.
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Draft Categories Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS draft_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  difficulty_guidance TEXT NOT NULL DEFAULT '',
  answer_format_guidance TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT 'chat_draft' CHECK (origin IN ('classic', 'chat_draft')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_draft_categories_user_id
  ON draft_categories(user_id);

-- Index for origin filtering
CREATE INDEX IF NOT EXISTS idx_draft_categories_origin
  ON draft_categories(origin);

-- Enable Row Level Security
ALTER TABLE draft_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own draft categories
CREATE POLICY "Users can view own draft categories"
  ON draft_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own draft categories"
  ON draft_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft categories"
  ON draft_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own draft categories"
  ON draft_categories FOR DELETE
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Board Templates Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  difficulty_1_to_10 INTEGER NOT NULL DEFAULT 7 CHECK (difficulty_1_to_10 BETWEEN 1 AND 10),
  categories JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_board_templates_user_id
  ON board_templates(user_id);

-- Index for theme searches
CREATE INDEX IF NOT EXISTS idx_board_templates_theme
  ON board_templates USING GIN (to_tsvector('english', theme));

-- Enable Row Level Security
ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own board templates
CREATE POLICY "Users can view own board templates"
  ON board_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own board templates"
  ON board_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own board templates"
  ON board_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own board templates"
  ON board_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Update Triggers for updated_at
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_draft_categories_updated_at
  BEFORE UPDATE ON draft_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_templates_updated_at
  BEFORE UPDATE ON board_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Success Messages
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete! Chat Board Builder tables created.';
  RAISE NOTICE '📋 Tables: draft_categories, board_templates';
  RAISE NOTICE '🔒 RLS policies enabled for both tables.';
  RAISE NOTICE '💡 You can now use the Chat Board Builder feature!';
END $$;
