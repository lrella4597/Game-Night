-- ============================================================================
-- UPDATE DEFAULT CATEGORIES: Game Night Favorites + 7/10 difficulty
-- ============================================================================
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This updates the trigger for NEW users AND adds missing categories for existing users.
-- Safe to run multiple times.
-- ============================================================================


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. Update the trigger function for NEW user sign-ups
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION seed_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO category_library (user_id, name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
  VALUES
    (
      NEW.id,
      'NAME THAT YEAR',
      'Generate Jeopardy clues where each clue lists 3 major events from the SAME year, spanning different categories: sports championships, #1 hit songs/albums, blockbuster movies, political events, world news, tech launches, celebrity moments, etc. The ANSWER is always the year. Target difficulty 7/10. Vary the decades (1950s-2020s). Each event should be independently verifiable.',
      'Target 7/10 difficulty. $200 = well-known years with obvious mega-events, $1000 = years requiring niche cross-category knowledge.',
      'The answer must ALWAYS be a four-digit year. Nothing else.',
      E'Q: The Berlin Wall fell, Taylor Swift was born, and Tim Burton''s Batman hit theaters. A: 1989\nQ: Obama was inaugurated, Avatar became the highest-grossing film, and Michael Jackson passed away. A: 2009'
    ),
    (
      NEW.id,
      'ARE YOU SMARTER THAN A 5TH GRADER',
      'Generate questions that an elementary school student should know but most adults have forgotten. Draw from grades 1-5 curricula: basic math, spelling rules, grammar, U.S. history, world geography, earth science, biology, civics. Target 7/10 difficulty — the humor comes from adults being stumped by easy school facts.',
      'Target 7/10 difficulty. $200 = 2nd grade level (still tricky for adults), $1000 = 5th grade level (facts most adults have completely forgotten).',
      'Answers should be concise — a single word, name, number, or short phrase.',
      E'Q: How many sides does a trapezoid have? A: 4\nQ: What type of rock is formed by volcanic lava cooling? A: Igneous rock'
    ),
    (
      NEW.id,
      'GEOGRAPHY',
      'Generate trivia questions about world geography: countries, capitals, physical features, world landmarks, rivers, mountain ranges, borders, flags, population, and surprising geographic facts. Target 7/10 difficulty — go beyond basic capital-of-France questions.',
      'Target 7/10 difficulty. $200 = well-known but not obvious geography, $1000 = obscure straits, enclaves, or facts that stump geography teachers.',
      'Answers should be place names — countries, cities, bodies of water, landmarks.',
      E'Q: This South American country is the largest by area. A: Brazil\nQ: This strait separates Europe from Africa. A: Strait of Gibraltar'
    ),
    (
      NEW.id,
      'SPORTS',
      'Generate trivia questions about professional sports: NFL, NBA, MLB, NHL, soccer, Olympics, tennis, golf, UFC. Cover athletes, championships, records, draft picks, iconic moments, rivalries, and statistical milestones. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = well-known sports moments and legends, $1000 = specific records, draft history, or minor sports trivia.',
      'Answers should be athlete names, team names, or specific facts/numbers.',
      E'Q: This swimmer holds the record for most Olympic gold medals. A: Michael Phelps\nQ: This team won the first ever Super Bowl. A: The Green Bay Packers'
    ),
    (
      NEW.id,
      'US STATES',
      'Generate trivia questions about the 50 U.S. states: capitals, nicknames, state birds/flowers/mottos, famous landmarks, admission dates, borders, population rankings, quirky laws, notable firsts, and state history. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = well-known state facts with a twist, $1000 = obscure state trivia that would stump most Americans.',
      'Answers should be U.S. state names, capitals, or specific state facts.',
      E'Q: Known as the Sunshine State, this state is home to Walt Disney World. A: Florida\nQ: This is the only state that borders only one other state. A: Maine'
    ),
    (
      NEW.id,
      'QUINNIPIAC UNIVERSITY',
      'Generate trivia questions about Quinnipiac University in Hamden, Connecticut. Cover: mascot (Bobcats), athletic conference (MAAC), notable alumni, polling institute, campus landmarks (York Hill, Rocky Top), founding history (1929, Connecticut College of Commerce), school colors (navy & gold), and traditions.',
      'Target 7/10 difficulty. $200 = basic facts any student knows, $1000 = deep history, specific alumni, or lesser-known traditions.',
      'Answers should be names, places, years, or specific facts about QU.',
      E'Q: This is Quinnipiac University''s mascot. A: The Bobcat\nQ: Quinnipiac is well known for this type of national survey. A: The Quinnipiac Poll'
    ),
    (
      NEW.id,
      'POP CULTURE',
      'Generate trivia questions about movies, TV shows, music, video games, memes, celebrities, and viral moments from the 1980s to present. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = well-known pop culture with a tricky angle, $1000 = deep-cut references or surprising connections.',
      'Answers should be titles, character names, or celebrity names.',
      E'Q: This Disney princess has a glass slipper. A: Cinderella\nQ: This director made Pulp Fiction. A: Quentin Tarantino'
    ),
    (
      NEW.id,
      'SCIENCE',
      'Generate trivia questions about science: physics, chemistry, biology, astronomy, earth science, and technology. Target 7/10 difficulty — go beyond textbook basics. Include surprising scientific facts, Nobel Prize winners, space exploration milestones.',
      'Target 7/10 difficulty. $200 = interesting science facts most educated adults would know, $1000 = graduate-level concepts or obscure discoveries.',
      'Answers should be concise — a term, name, number, or short phrase.',
      E'Q: This is the chemical symbol for gold. A: Au\nQ: This force keeps planets in orbit. A: Gravity'
    ),
    (
      NEW.id,
      'HISTORY',
      'Generate trivia questions about world history: wars, civilizations, turning-point events, historical figures, treaties, and surprising historical facts. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = important historical events with a tricky angle, $1000 = obscure treaties or surprising historical facts.',
      'Answers should be a proper noun — a person, place, event, or document title.',
      E'Q: He was the first President of the United States. A: George Washington\nQ: This 1215 document limited the power of the English king. A: The Magna Carta'
    ),
    (
      NEW.id,
      'FOOD & DRINK',
      'Generate trivia questions about food and drink: cooking techniques, global cuisines, beverages, restaurant culture, food origins, ingredient science, and culinary history. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = interesting food facts most foodies would know, $1000 = obscure culinary techniques or food history deep cuts.',
      'Answers should be ingredient names, dish names, or cooking terms.',
      E'Q: This fruit is the main ingredient in guacamole. A: Avocado\nQ: This spice, from crocus flowers, is the most expensive by weight. A: Saffron'
    ),
    (
      NEW.id,
      'MOVIES',
      'Generate trivia questions about films: directors, actors, iconic quotes, plot twists, Oscar history, box office records, behind-the-scenes facts. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = well-known films with a tricky angle, $1000 = indie films, specific award years, or production secrets.',
      'Answers should be movie titles, actor/director names, or character names.',
      E'Q: This 1994 film follows a man sitting on a bench telling his life story. A: Forrest Gump\nQ: This director is known for Inception and The Dark Knight. A: Christopher Nolan'
    ),
    (
      NEW.id,
      'MUSIC',
      'Generate trivia questions about music: artists, albums, songs, genres, music history, Grammy Awards, lyrics, collaborations. Cover classic rock, pop, hip-hop, R&B, country. Target 7/10 difficulty.',
      'Target 7/10 difficulty. $200 = well-known music facts with a twist, $1000 = deep cuts, specific chart records, or music theory.',
      'Answers should be artist names, song titles, or album names.',
      E'Q: This artist released the album 21 in 2011. A: Adele\nQ: This band released Dark Side of the Moon in 1973. A: Pink Floyd'
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'seed_default_categories failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger (function was replaced above, trigger stays the same)
DROP TRIGGER IF EXISTS on_auth_user_created_seed_categories ON auth.users;
CREATE TRIGGER on_auth_user_created_seed_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION seed_default_categories();


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. Add the NEW categories for EXISTING users (only if they don't already have them)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Insert new categories for all existing users who don't have them yet
INSERT INTO category_library (user_id, name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
SELECT u.id, v.name, v.prompt_template, v.difficulty_guidance, v.answer_format_guidance, v.examples
FROM auth.users u
CROSS JOIN (VALUES
  ('NAME THAT YEAR',
   'Generate Jeopardy clues where each clue lists 3 major events from the SAME year, spanning different categories: sports championships, #1 hit songs/albums, blockbuster movies, political events, world news, tech launches, celebrity moments, etc. The ANSWER is always the year. Target difficulty 7/10. Vary the decades (1950s-2020s).',
   'Target 7/10 difficulty. $200 = well-known years with obvious mega-events, $1000 = years requiring niche cross-category knowledge.',
   'The answer must ALWAYS be a four-digit year. Nothing else.',
   E'Q: The Berlin Wall fell, Taylor Swift was born, and Tim Burton''s Batman hit theaters. A: 1989\nQ: Obama was inaugurated, Avatar became the highest-grossing film, and Michael Jackson passed away. A: 2009'),
  ('ARE YOU SMARTER THAN A 5TH GRADER',
   'Generate questions that an elementary school student should know but most adults have forgotten. Draw from grades 1-5 curricula. Target 7/10 difficulty.',
   'Target 7/10 difficulty. $200 = 2nd grade level, $1000 = 5th grade level.',
   'Answers should be concise — a single word, name, number, or short phrase.',
   E'Q: How many sides does a trapezoid have? A: 4\nQ: What type of rock is formed by volcanic lava cooling? A: Igneous rock'),
  ('US STATES',
   'Generate trivia questions about the 50 U.S. states: capitals, nicknames, state birds/flowers/mottos, famous landmarks, admission dates, borders, population rankings. Target 7/10 difficulty.',
   'Target 7/10 difficulty. $200 = well-known state facts, $1000 = obscure state trivia.',
   'Answers should be U.S. state names, capitals, or specific state facts.',
   E'Q: Known as the Sunshine State, this state is home to Walt Disney World. A: Florida\nQ: This is the only state that borders only one other state. A: Maine'),
  ('QUINNIPIAC UNIVERSITY',
   'Generate trivia questions about Quinnipiac University in Hamden, Connecticut. Cover: mascot (Bobcats), polling institute, campus, founding history (1929), school colors (navy & gold).',
   'Target 7/10 difficulty. $200 = basic facts, $1000 = deep history or lesser-known traditions.',
   'Answers should be names, places, years, or specific facts about QU.',
   E'Q: This is Quinnipiac University''s mascot. A: The Bobcat\nQ: Quinnipiac is well known for this type of national survey. A: The Quinnipiac Poll'),
  ('MOVIES',
   'Generate trivia questions about films: directors, actors, iconic quotes, plot twists, Oscar history, box office records. Target 7/10 difficulty.',
   'Target 7/10 difficulty. $200 = well-known films, $1000 = indie films or production secrets.',
   'Answers should be movie titles, actor/director names, or character names.',
   E'Q: This 1994 film follows a man on a bench telling his life story. A: Forrest Gump\nQ: This director is known for Inception and The Dark Knight. A: Christopher Nolan'),
  ('MUSIC',
   'Generate trivia questions about music: artists, albums, songs, genres, Grammy Awards, lyrics. Target 7/10 difficulty.',
   'Target 7/10 difficulty. $200 = well-known music facts, $1000 = deep cuts or chart records.',
   'Answers should be artist names, song titles, or album names.',
   E'Q: This artist released the album 21 in 2011. A: Adele\nQ: This band released Dark Side of the Moon in 1973. A: Pink Floyd')
) AS v(name, prompt_template, difficulty_guidance, answer_format_guidance, examples)
WHERE NOT EXISTS (
  SELECT 1 FROM category_library cl WHERE cl.user_id = u.id AND UPPER(cl.name) = UPPER(v.name)
);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Done!
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
BEGIN
  RAISE NOTICE 'Category update complete!';
  RAISE NOTICE '  - Trigger updated: new users get 12 categories (game night favorites)';
  RAISE NOTICE '  - Existing users: 6 new categories added (Name That Year, 5th Grader, US States, QU, Movies, Music)';
  RAISE NOTICE '  - All categories now target 7/10 difficulty';
END $$;
