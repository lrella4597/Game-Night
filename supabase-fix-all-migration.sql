-- ============================================================================
-- COMBINED MIGRATION: Fix all post-login errors + seed default categories
-- ============================================================================
-- Run this entire script in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- It handles:
--   1. Add theme_colors column to game_settings
--   2. Create generation_state table
--   3. Create draft_categories table
--   4. Create board_templates table
--   5. Seed 6 default categories for every new user on sign-up
-- ============================================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Add theme_colors column to game_settings
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

COMMENT ON COLUMN game_settings.theme_colors IS
  'Stores custom theme color configuration as JSON.';


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Create generation_state table
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS generation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seen_answers TEXT[] DEFAULT '{}',
  seen_topics TEXT[] DEFAULT '{}',
  seen_clues TEXT[] DEFAULT '{}',
  favorite_clues JSONB DEFAULT '[]',
  disliked_clues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_generation_state_user_id ON generation_state(user_id);

ALTER TABLE generation_state ENABLE ROW LEVEL SECURITY;

-- Drop policy if it already exists (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own generation state" ON generation_state;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can manage their own generation state"
  ON generation_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_generation_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generation_state_updated_at ON generation_state;
CREATE TRIGGER generation_state_updated_at
  BEFORE UPDATE ON generation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_generation_state_timestamp();

-- Helper function: add items to seen arrays
CREATE OR REPLACE FUNCTION add_to_generation_state(
  p_user_id UUID,
  p_answers TEXT[] DEFAULT NULL,
  p_topics TEXT[] DEFAULT NULL,
  p_clues TEXT[] DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO generation_state (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE generation_state
  SET
    seen_answers = CASE
      WHEN p_answers IS NOT NULL THEN
        ARRAY(SELECT DISTINCT unnest(seen_answers || p_answers))
      ELSE seen_answers
    END,
    seen_topics = CASE
      WHEN p_topics IS NOT NULL THEN
        ARRAY(SELECT DISTINCT unnest(seen_topics || p_topics))
      ELSE seen_topics
    END,
    seen_clues = CASE
      WHEN p_clues IS NOT NULL THEN
        ARRAY(SELECT DISTINCT unnest(seen_clues || p_clues))
      ELSE seen_clues
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_favorite_clue(p_user_id UUID, p_clue JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO generation_state (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE generation_state
  SET favorite_clues = (
    SELECT jsonb_agg(elem)
    FROM (SELECT elem FROM jsonb_array_elements(favorite_clues || p_clue) elem
          ORDER BY (elem->>'savedAt')::BIGINT DESC LIMIT 50) sub
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION add_disliked_clue(p_user_id UUID, p_clue JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO generation_state (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  UPDATE generation_state
  SET disliked_clues = (
    SELECT jsonb_agg(elem)
    FROM (SELECT elem FROM jsonb_array_elements(disliked_clues || p_clue) elem
          ORDER BY (elem->>'rejectedAt')::BIGINT DESC LIMIT 100) sub
  )
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_generation_state(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE generation_state
  SET seen_answers = '{}', seen_topics = '{}', seen_clues = '{}'
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. Create draft_categories table
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

CREATE INDEX IF NOT EXISTS idx_draft_categories_user_id ON draft_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_categories_origin ON draft_categories(origin);

ALTER TABLE draft_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own draft categories" ON draft_categories;
  DROP POLICY IF EXISTS "Users can insert own draft categories" ON draft_categories;
  DROP POLICY IF EXISTS "Users can update own draft categories" ON draft_categories;
  DROP POLICY IF EXISTS "Users can delete own draft categories" ON draft_categories;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own draft categories" ON draft_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own draft categories" ON draft_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own draft categories" ON draft_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own draft categories" ON draft_categories FOR DELETE USING (auth.uid() = user_id);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. Create board_templates table
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

CREATE INDEX IF NOT EXISTS idx_board_templates_user_id ON board_templates(user_id);

ALTER TABLE board_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own board templates" ON board_templates;
  DROP POLICY IF EXISTS "Users can insert own board templates" ON board_templates;
  DROP POLICY IF EXISTS "Users can update own board templates" ON board_templates;
  DROP POLICY IF EXISTS "Users can delete own board templates" ON board_templates;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "Users can view own board templates" ON board_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own board templates" ON board_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own board templates" ON board_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own board templates" ON board_templates FOR DELETE USING (auth.uid() = user_id);

-- Updated-at triggers for both tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_draft_categories_updated_at ON draft_categories;
CREATE TRIGGER update_draft_categories_updated_at
  BEFORE UPDATE ON draft_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_board_templates_updated_at ON board_templates;
CREATE TRIGGER update_board_templates_updated_at
  BEFORE UPDATE ON board_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. Seed default categories for new users on sign-up
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO category_library (user_id, name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
  VALUES
    (
      NEW.id,
      'SCIENCE',
      'Generate trivia questions about science topics including physics, chemistry, biology, astronomy, and earth science.',
      '$100 = well-known facts (water boils at 100°C), $500 = graduate-level concepts.',
      'Answers should be concise — a term, name, number, or short phrase.',
      E'Q: This is the chemical symbol for gold. A: Au\nQ: This force keeps planets in orbit. A: Gravity'
    ),
    (
      NEW.id,
      'HISTORY',
      'Generate trivia questions about world history, major wars, civilizations, and turning-point events.',
      '$100 = famous battles/dates, $500 = obscure treaties or secondary figures.',
      'Answers should be a proper noun — a person, place, event, or document title.',
      E'Q: He was the first President of the United States. A: George Washington\nQ: This 1215 document limited the power of the English king. A: The Magna Carta'
    ),
    (
      NEW.id,
      'POP CULTURE',
      'Generate trivia questions about movies, TV shows, music, video games, memes, and celebrity culture.',
      '$100 = blockbuster/mainstream, $500 = cult classic or deep-cut knowledge.',
      'Answers should be titles, character names, or celebrity names.',
      E'Q: This Disney princess has a glass slipper. A: Cinderella\nQ: This director made Pulp Fiction. A: Quentin Tarantino'
    ),
    (
      NEW.id,
      'GEOGRAPHY',
      'Generate trivia questions about countries, capitals, physical features, and world landmarks.',
      '$100 = major capitals and continents, $500 = obscure straits, islands, or borders.',
      'Answers should be place names.',
      E'Q: This is the capital of France. A: Paris\nQ: This mountain is the tallest in the world. A: Mount Everest'
    ),
    (
      NEW.id,
      'SPORTS',
      'Generate trivia questions about professional sports, athletes, championships, and records.',
      '$100 = hall-of-famers and basic rules, $500 = specific records or minor sports.',
      'Answers should be athlete names, team names, or numerical records.',
      E'Q: This sport uses a shuttlecock. A: Badminton\nQ: This swimmer holds the record for most Olympic gold medals. A: Michael Phelps'
    ),
    (
      NEW.id,
      'FOOD & DRINK',
      'Generate trivia questions about food, cooking techniques, global cuisines, and beverages.',
      '$100 = common ingredients and dishes, $500 = obscure culinary techniques or regional specialties.',
      'Answers should be ingredient names, dish names, or cooking terms.',
      E'Q: This fruit is the main ingredient in guacamole. A: Avocado\nQ: This spice, from crocus flowers, is the most expensive by weight. A: Saffron'
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'seed_default_categories failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created_seed_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_categories();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. Backfill: Seed defaults for EXISTING users who have zero categories
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSERT INTO category_library (user_id, name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
SELECT u.id, v.name, v.prompt_template, v.difficulty_guidance, v.answer_format_guidance, v.examples
FROM auth.users u
CROSS JOIN (VALUES
  ('SCIENCE',
   'Generate trivia questions about science topics including physics, chemistry, biology, astronomy, and earth science.',
   '$100 = well-known facts (water boils at 100°C), $500 = graduate-level concepts.',
   'Answers should be concise — a term, name, number, or short phrase.',
   E'Q: This is the chemical symbol for gold. A: Au\nQ: This force keeps planets in orbit. A: Gravity'),
  ('HISTORY',
   'Generate trivia questions about world history, major wars, civilizations, and turning-point events.',
   '$100 = famous battles/dates, $500 = obscure treaties or secondary figures.',
   'Answers should be a proper noun — a person, place, event, or document title.',
   E'Q: He was the first President of the United States. A: George Washington\nQ: This 1215 document limited the power of the English king. A: The Magna Carta'),
  ('POP CULTURE',
   'Generate trivia questions about movies, TV shows, music, video games, memes, and celebrity culture.',
   '$100 = blockbuster/mainstream, $500 = cult classic or deep-cut knowledge.',
   'Answers should be titles, character names, or celebrity names.',
   E'Q: This Disney princess has a glass slipper. A: Cinderella\nQ: This director made Pulp Fiction. A: Quentin Tarantino'),
  ('GEOGRAPHY',
   'Generate trivia questions about countries, capitals, physical features, and world landmarks.',
   '$100 = major capitals and continents, $500 = obscure straits, islands, or borders.',
   'Answers should be place names.',
   E'Q: This is the capital of France. A: Paris\nQ: This mountain is the tallest in the world. A: Mount Everest'),
  ('SPORTS',
   'Generate trivia questions about professional sports, athletes, championships, and records.',
   '$100 = hall-of-famers and basic rules, $500 = specific records or minor sports.',
   'Answers should be athlete names, team names, or numerical records.',
   E'Q: This sport uses a shuttlecock. A: Badminton\nQ: This swimmer holds the record for most Olympic gold medals. A: Michael Phelps'),
  ('FOOD & DRINK',
   'Generate trivia questions about food, cooking techniques, global cuisines, and beverages.',
   '$100 = common ingredients and dishes, $500 = obscure culinary techniques or regional specialties.',
   'Answers should be ingredient names, dish names, or cooking terms.',
   E'Q: This fruit is the main ingredient in guacamole. A: Avocado\nQ: This spice, from crocus flowers, is the most expensive by weight. A: Saffron')
) AS v(name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
WHERE NOT EXISTS (
  SELECT 1 FROM category_library cl WHERE cl.user_id = u.id
);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Done!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '  1. theme_colors column added to game_settings';
  RAISE NOTICE '  2. generation_state table created';
  RAISE NOTICE '  3. draft_categories table created';
  RAISE NOTICE '  4. board_templates table created';
  RAISE NOTICE '  5. Default categories trigger installed (new sign-ups get 6 categories)';
  RAISE NOTICE '  6. Existing users backfilled with default categories (if they had none)';
END $$;
