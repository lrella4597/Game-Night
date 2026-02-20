-- Live Jeopardy: Host Companion + Session Resilience Migration
-- Run this in the Supabase SQL Editor

-- 1. Add host_companion_token to live_sessions
ALTER TABLE live_sessions
ADD COLUMN IF NOT EXISTS host_companion_token TEXT;

-- 2. Fix phase CHECK constraint to include 'prep' (used in code but missing from DB)
-- Drop old constraint and recreate with all phases
ALTER TABLE live_game_state DROP CONSTRAINT IF EXISTS live_game_state_phase_check;
ALTER TABLE live_game_state ADD CONSTRAINT live_game_state_phase_check
  CHECK (phase IN (
    'lobby', 'prep', 'round_intro', 'board_select',
    'clue_display', 'buzzer_open', 'answer_check',
    'daily_double_wager', 'daily_double_answer',
    'final_category', 'final_wager', 'final_clue',
    'final_draw', 'final_locked', 'final_reveal',
    'game_over'
  ));
