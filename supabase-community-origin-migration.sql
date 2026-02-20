-- ============================================================================
-- COMMUNITY ORIGIN TRACKING MIGRATION
-- ============================================================================
-- Adds 'origin' tracking so users can see which boards and categories
-- came from the community.
--
-- 1. Adds 'origin' column to boards table
-- 2. Updates category_library CHECK constraint to allow 'community'
--
-- Safe to run multiple times (uses IF NOT EXISTS checks).
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- ── 1. Add origin column to boards table ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'boards' AND column_name = 'origin'
  ) THEN
    ALTER TABLE boards ADD COLUMN origin TEXT DEFAULT NULL;
  END IF;
END $$;

-- ── 2. Update category_library CHECK constraint to allow 'community' ────────

-- Drop the old constraint (only allows 'classic', 'chat_draft')
DO $$
BEGIN
  -- Try to drop the existing check constraint on origin
  ALTER TABLE category_library DROP CONSTRAINT IF EXISTS category_library_origin_check;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add updated constraint that includes 'community'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'category_library' AND constraint_name = 'category_library_origin_check_v2'
  ) THEN
    ALTER TABLE category_library
      ADD CONSTRAINT category_library_origin_check_v2
      CHECK (origin IN ('classic', 'chat_draft', 'community'));
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'Community origin migration complete!';
  RAISE NOTICE 'boards table now has origin column';
  RAISE NOTICE 'category_library CHECK constraint now allows community origin';
END $$;
