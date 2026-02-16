-- ============================================================================
-- Migration: Add theme_colors column to game_settings table
-- ============================================================================
-- This migration adds the ability to save custom theme colors to the database.
-- Run this in your Supabase SQL Editor to enable theme persistence.
--
-- After running this, themes will save and persist across sessions!
-- ============================================================================

-- Add theme_colors column to game_settings table
ALTER TABLE game_settings
ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT '{
  "background": "#F7F8FA",
  "foreground": "#0B1220",
  "accent": "#D7FF2F",
  "boardBackground": "#F7F8FA",
  "tileBackground": "#0B1220",
  "tileText": "#FFFFFF",
  "tileBorder": "#1E293B",
  "cardBackground": "#FFFFFF",
  "cardBorder": "#E2E8F0"
}'::JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN game_settings.theme_colors IS
  'Stores custom theme color configuration as JSON. Contains keys: background, foreground, accent, boardBackground, tileBackground, tileText, tileBorder, cardBackground, cardBorder';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete! The theme_colors column has been added to game_settings.';
  RAISE NOTICE '💡 Themes will now persist across sessions!';
END $$;
