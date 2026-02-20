-- ============================================================================
-- COMMUNITY SHARING — FULL MIGRATION
-- ============================================================================
-- Creates the complete community system from scratch:
-- Part A: Community boards + voting (base tables)
-- Part B: Game mode tagging on boards
-- Part C: Community categories + voting (new)
--
-- Safe to run even if tables already exist (uses IF NOT EXISTS).
-- Run this in your Supabase SQL Editor.
-- ============================================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART A: Community Boards (base)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS community_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  source_board_id UUID REFERENCES boards(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  board_data JSONB NOT NULL,
  category_names TEXT[] NOT NULL DEFAULT '{}',

  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_boards_author_id ON community_boards(author_id);
CREATE INDEX IF NOT EXISTS idx_community_boards_created_at ON community_boards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_boards_score ON community_boards((upvotes - downvotes) DESC);

ALTER TABLE community_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view community boards" ON community_boards;
CREATE POLICY "Authenticated users can view community boards"
  ON community_boards FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own community boards" ON community_boards;
CREATE POLICY "Users can insert own community boards"
  ON community_boards FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own community boards" ON community_boards;
CREATE POLICY "Users can update own community boards"
  ON community_boards FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own community boards" ON community_boards;
CREATE POLICY "Users can delete own community boards"
  ON community_boards FOR DELETE
  USING (auth.uid() = author_id);

-- ── Board Votes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_board_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES community_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_board_votes_board_id ON community_board_votes(board_id);
CREATE INDEX IF NOT EXISTS idx_community_board_votes_user_id ON community_board_votes(user_id);

ALTER TABLE community_board_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view votes" ON community_board_votes;
CREATE POLICY "Authenticated users can view votes"
  ON community_board_votes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own votes" ON community_board_votes;
CREATE POLICY "Users can insert own votes"
  ON community_board_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own votes" ON community_board_votes;
CREATE POLICY "Users can update own votes"
  ON community_board_votes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own votes" ON community_board_votes;
CREATE POLICY "Users can delete own votes"
  ON community_board_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Board Vote Function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION vote_community_board(
  p_board_id UUID,
  p_user_id UUID,
  p_vote SMALLINT -- 1 = upvote, -1 = downvote, 0 = remove vote
)
RETURNS TABLE (new_upvotes INTEGER, new_downvotes INTEGER) AS $$
BEGIN
  IF p_vote = 0 THEN
    DELETE FROM community_board_votes
    WHERE board_id = p_board_id AND user_id = p_user_id;
  ELSE
    INSERT INTO community_board_votes (board_id, user_id, vote)
    VALUES (p_board_id, p_user_id, p_vote)
    ON CONFLICT (board_id, user_id)
    DO UPDATE SET vote = p_vote;
  END IF;

  UPDATE community_boards SET
    upvotes = (SELECT COUNT(*) FROM community_board_votes WHERE board_id = p_board_id AND vote = 1),
    downvotes = (SELECT COUNT(*) FROM community_board_votes WHERE board_id = p_board_id AND vote = -1),
    updated_at = NOW()
  WHERE id = p_board_id;

  RETURN QUERY
  SELECT cb.upvotes, cb.downvotes
  FROM community_boards cb
  WHERE cb.id = p_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Board updated_at trigger ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_community_boards_updated_at ON community_boards;
CREATE TRIGGER update_community_boards_updated_at
  BEFORE UPDATE ON community_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART B: Add mode column to community_boards
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE community_boards
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'community_boards' AND constraint_name = 'community_boards_mode_check'
  ) THEN
    ALTER TABLE community_boards
      ADD CONSTRAINT community_boards_mode_check
      CHECK (mode IS NULL OR mode IN ('trivia_free4all', 'classic_jeopardy'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_boards_mode ON community_boards(mode);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PART C: Community Categories
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS community_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  source_category_id UUID REFERENCES category_library(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prompt_template TEXT NOT NULL DEFAULT '',
  difficulty_guidance TEXT NOT NULL DEFAULT '',
  answer_format_guidance TEXT NOT NULL DEFAULT '',
  examples TEXT NOT NULL DEFAULT '',

  upvotes INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_categories_author_id ON community_categories(author_id);
CREATE INDEX IF NOT EXISTS idx_community_categories_created_at ON community_categories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_categories_upvotes ON community_categories(upvotes DESC);

-- ── Category Votes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_category_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(category_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_category_votes_category ON community_category_votes(category_id);
CREATE INDEX IF NOT EXISTS idx_community_category_votes_user ON community_category_votes(user_id);

-- ── RLS for categories + votes ───────────────────────────────────────────────

ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view community categories" ON community_categories;
CREATE POLICY "Authenticated users can view community categories"
  ON community_categories FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own community categories" ON community_categories;
CREATE POLICY "Users can insert own community categories"
  ON community_categories FOR INSERT
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own community categories" ON community_categories;
CREATE POLICY "Users can update own community categories"
  ON community_categories FOR UPDATE
  USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete own community categories" ON community_categories;
CREATE POLICY "Users can delete own community categories"
  ON community_categories FOR DELETE
  USING (auth.uid() = author_id);

ALTER TABLE community_category_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view category votes" ON community_category_votes;
CREATE POLICY "Authenticated users can view category votes"
  ON community_category_votes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can insert own category votes" ON community_category_votes;
CREATE POLICY "Users can insert own category votes"
  ON community_category_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own category votes" ON community_category_votes;
CREATE POLICY "Users can delete own category votes"
  ON community_category_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Category Vote Function (toggle upvote) ──────────────────────────────────

CREATE OR REPLACE FUNCTION vote_community_category(
  p_category_id UUID,
  p_user_id UUID
)
RETURNS TABLE (new_upvotes INTEGER) AS $$
DECLARE
  existing_vote UUID;
BEGIN
  SELECT id INTO existing_vote
  FROM community_category_votes
  WHERE category_id = p_category_id AND user_id = p_user_id;

  IF existing_vote IS NOT NULL THEN
    DELETE FROM community_category_votes WHERE id = existing_vote;
  ELSE
    INSERT INTO community_category_votes (category_id, user_id)
    VALUES (p_category_id, p_user_id);
  END IF;

  UPDATE community_categories SET
    upvotes = (SELECT COUNT(*) FROM community_category_votes WHERE category_id = p_category_id),
    updated_at = NOW()
  WHERE id = p_category_id;

  RETURN QUERY
  SELECT cc.upvotes FROM community_categories cc WHERE cc.id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Category updated_at trigger ──────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_community_categories_updated_at ON community_categories;
CREATE TRIGGER update_community_categories_updated_at
  BEFORE UPDATE ON community_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'Community sharing migration complete!';
  RAISE NOTICE 'Tables: community_boards, community_board_votes, community_categories, community_category_votes';
  RAISE NOTICE 'Functions: vote_community_board, vote_community_category';
  RAISE NOTICE 'New column: community_boards.mode';
END $$;
