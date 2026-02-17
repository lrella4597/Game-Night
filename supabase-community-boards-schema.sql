-- ============================================================================
-- COMMUNITY BOARDS SCHEMA
-- ============================================================================
-- Adds community board sharing with Reddit-style upvote/downvote system.
--
-- Tables created:
-- 1. community_boards - Published boards available to all users
-- 2. community_board_votes - Track user votes on boards
--
-- Run this in your Supabase SQL Editor after the main schema.
-- ============================================================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Community Boards Table
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

-- All authenticated users can browse
DROP POLICY IF EXISTS "Authenticated users can view community boards" ON community_boards;
CREATE POLICY "Authenticated users can view community boards"
  ON community_boards FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can publish their own boards
DROP POLICY IF EXISTS "Users can insert own community boards" ON community_boards;
CREATE POLICY "Users can insert own community boards"
  ON community_boards FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Users can update their own boards (title, description only)
DROP POLICY IF EXISTS "Users can update own community boards" ON community_boards;
CREATE POLICY "Users can update own community boards"
  ON community_boards FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete (unpublish) their own boards
DROP POLICY IF EXISTS "Users can delete own community boards" ON community_boards;
CREATE POLICY "Users can delete own community boards"
  ON community_boards FOR DELETE
  USING (auth.uid() = author_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Community Board Votes Table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

-- All authenticated users can see votes
DROP POLICY IF EXISTS "Authenticated users can view votes" ON community_board_votes;
CREATE POLICY "Authenticated users can view votes"
  ON community_board_votes FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users can manage their own votes
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

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Vote Function (handles upsert + count recalculation)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION vote_community_board(
  p_board_id UUID,
  p_user_id UUID,
  p_vote SMALLINT -- 1 = upvote, -1 = downvote, 0 = remove vote
)
RETURNS TABLE (new_upvotes INTEGER, new_downvotes INTEGER) AS $$
BEGIN
  IF p_vote = 0 THEN
    -- Remove existing vote
    DELETE FROM community_board_votes
    WHERE board_id = p_board_id AND user_id = p_user_id;
  ELSE
    -- Upsert vote
    INSERT INTO community_board_votes (board_id, user_id, vote)
    VALUES (p_board_id, p_user_id, p_vote)
    ON CONFLICT (board_id, user_id)
    DO UPDATE SET vote = p_vote;
  END IF;

  -- Recalculate counts
  UPDATE community_boards SET
    upvotes = (SELECT COUNT(*) FROM community_board_votes WHERE board_id = p_board_id AND vote = 1),
    downvotes = (SELECT COUNT(*) FROM community_board_votes WHERE board_id = p_board_id AND vote = -1),
    updated_at = NOW()
  WHERE id = p_board_id;

  -- Return new totals
  RETURN QUERY
  SELECT cb.upvotes, cb.downvotes
  FROM community_boards cb
  WHERE cb.id = p_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Updated_at trigger for community_boards
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP TRIGGER IF EXISTS update_community_boards_updated_at ON community_boards;
CREATE TRIGGER update_community_boards_updated_at
  BEFORE UPDATE ON community_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'Community boards schema migration complete!';
  RAISE NOTICE 'Tables: community_boards, community_board_votes';
  RAISE NOTICE 'Function: vote_community_board';
END $$;
