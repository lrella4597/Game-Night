export interface CategoryLibraryItem {
  id: string;
  name: string;
  /** Main system instruction sent to the AI generator. */
  promptTemplate: string;
  /** Guidance on difficulty scaling (e.g. "100 pts = pop-quiz, 500 pts = expert"). */
  difficultyGuidance: string;
  /** Guidance on how answers should be formatted (e.g. "Proper nouns only"). */
  answerFormatGuidance: string;
  /** Optional few-shot examples, one per line. */
  examples: string;
  createdAt: number;
}

export const DEFAULT_LIBRARY: CategoryLibraryItem[] = [
  {
    id: "lib-name-that-year",
    name: "NAME THAT YEAR",
    promptTemplate:
      "Generate Jeopardy clues where each clue lists 3 major events from the SAME year, spanning different categories: sports championships, #1 hit songs/albums, blockbuster movies, political events, world news, tech launches, celebrity moments, etc. The ANSWER is always the year. Target difficulty 7/10 — clues should stump casual players but be gettable for trivia buffs. Vary the decades (1950s–2020s). Each event should be independently verifiable and well-known in its own domain. Never repeat a year across clues.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known years with obvious mega-events, $1000 = years that require connecting niche cross-category events from different domains.",
    answerFormatGuidance:
      "The answer must ALWAYS be a four-digit year. Nothing else.",
    examples:
      "Q: The Berlin Wall fell, Taylor Swift was born, and Tim Burton's Batman hit theaters. A: 1989\nQ: Obama was inaugurated, Avatar became the highest-grossing film, and Michael Jackson passed away. A: 2009\nQ: The Red Sox broke the Curse, Facebook launched, and Usher's 'Yeah!' topped the charts. A: 2004",
    createdAt: 0,
  },
  {
    id: "lib-5th-grader",
    name: "ARE YOU SMARTER THAN A 5TH GRADER",
    promptTemplate:
      "Generate questions that an elementary school student should know but most adults have forgotten. Draw from grades 1-5 curricula: basic math, spelling rules, grammar, U.S. history, world geography, earth science, biology, civics, and reading. Target 7/10 difficulty — the humor comes from adults being stumped by 'easy' school facts. Focus on specific textbook facts that sound simple but trip people up.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = 2nd grade level (still tricky for adults), $1000 = 5th grade level (facts most adults have completely forgotten).",
    answerFormatGuidance:
      "Answers should be concise — a single word, name, number, or short phrase.",
    examples:
      "Q: How many sides does a trapezoid have? A: 4\nQ: What is the largest ocean on Earth? A: The Pacific Ocean\nQ: What type of rock is formed by volcanic lava cooling? A: Ignite­ous rock",
    createdAt: 0,
  },
  {
    id: "lib-geography",
    name: "GEOGRAPHY",
    promptTemplate:
      "Generate trivia questions about world geography: countries, capitals, physical features, world landmarks, rivers, mountain ranges, borders, flags, population, and surprising geographic facts. Target 7/10 difficulty — go beyond basic 'capital of France' questions. Include tricky border trivia, landlocked countries, surprising geographic records, and 'which country' puzzles.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known but not obvious geography, $1000 = obscure straits, enclaves, or facts that would stump a geography teacher.",
    answerFormatGuidance:
      "Answers should be place names — countries, cities, bodies of water, landmarks.",
    examples:
      "Q: This is the capital of France. A: Paris\nQ: This strait separates Europe from Africa. A: Strait of Gibraltar",
    createdAt: 0,
  },
  {
    id: "lib-sports",
    name: "SPORTS",
    promptTemplate:
      "Generate trivia questions about professional sports: NFL, NBA, MLB, NHL, soccer, Olympics, tennis, golf, UFC, and more. Cover athletes, championships, records, draft picks, iconic moments, rivalries, and statistical milestones. Target 7/10 difficulty — go beyond obvious Hall of Famers. Include specific stats, upset victories, trade details, and cross-sport comparisons that reward true sports fans.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known sports moments and legends, $1000 = specific records, draft history, or minor sports trivia.",
    answerFormatGuidance:
      "Answers should be athlete names, team names, or specific facts/numbers.",
    examples:
      "Q: This swimmer holds the record for most Olympic gold medals. A: Michael Phelps\nQ: This team won the first ever Super Bowl. A: The Green Bay Packers",
    createdAt: 0,
  },
  {
    id: "lib-us-states",
    name: "US STATES",
    promptTemplate:
      "Generate trivia questions about the 50 U.S. states: capitals, nicknames, state birds/flowers/mottos, famous landmarks, admission dates, borders, population rankings, quirky laws, notable firsts, and state history. Target 7/10 difficulty — go beyond 'What's the capital of California?' Include surprising facts, border trivia, state record holders, and obscure nicknames.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known state facts with a twist, $1000 = obscure state trivia that would stump most Americans.",
    answerFormatGuidance:
      "Answers should be U.S. state names, capitals, or specific state facts.",
    examples:
      "Q: Known as the 'Sunshine State', this state is home to Walt Disney World. A: Florida\nQ: This is the only state that borders only one other state. A: Maine",
    createdAt: 0,
  },
  {
    id: "lib-quinnipiac",
    name: "QUINNIPIAC UNIVERSITY",
    promptTemplate:
      "Generate trivia questions about Quinnipiac University in Hamden, Connecticut. Cover topics like: campus life, mascot (Bobcats), athletic conference (MAAC), notable alumni, academic programs (especially the polling institute), campus landmarks (York Hill, Rocky Top), founding history (1929, originally Connecticut College of Commerce), school colors (navy & gold), and traditions.",
    difficultyGuidance:
      "$100 = basic facts any student knows (mascot, location, colors), $500 = deep history, specific alumni, or lesser-known traditions.",
    answerFormatGuidance:
      "Answers should be names, places, years, or specific facts about QU.",
    examples:
      "Q: This is Quinnipiac University's mascot. A: The Bobcat\nQ: Quinnipiac is well known for this type of national survey that measures public opinion. A: The Quinnipiac Poll",
    createdAt: 0,
  },
  {
    id: "lib-pop-culture",
    name: "POP CULTURE",
    promptTemplate:
      "Generate trivia questions about movies, TV shows, music, video games, memes, celebrities, and viral moments from the 1980s to present. Target 7/10 difficulty — go beyond 'who starred in Titanic?' Include specific episode references, behind-the-scenes facts, box office records, and connections between pop culture moments.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known pop culture with a tricky angle, $1000 = deep-cut references or surprising connections.",
    answerFormatGuidance:
      "Answers should be titles, character names, or celebrity names.",
    examples:
      "Q: This Disney princess has a glass slipper. A: Cinderella\nQ: This director made Pulp Fiction. A: Quentin Tarantino",
    createdAt: 0,
  },
  {
    id: "lib-science",
    name: "SCIENCE",
    promptTemplate:
      "Generate trivia questions about science: physics, chemistry, biology, astronomy, earth science, and technology. Target 7/10 difficulty — go beyond textbook basics. Include surprising scientific facts, Nobel Prize winners, space exploration milestones, and counterintuitive phenomena.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = interesting science facts most educated adults would know, $1000 = graduate-level concepts or obscure discoveries.",
    answerFormatGuidance:
      "Answers should be concise — a term, name, number, or short phrase.",
    examples:
      "Q: This is the chemical symbol for gold. A: Au\nQ: This force keeps planets in orbit. A: Gravity",
    createdAt: 0,
  },
  {
    id: "lib-history",
    name: "HISTORY",
    promptTemplate:
      "Generate trivia questions about world history: wars, civilizations, turning-point events, historical figures, treaties, and surprising historical facts. Target 7/10 difficulty — go beyond 'who was the first president?' Include lesser-known but fascinating historical connections, specific dates of pivotal events, and 'what came first?' style questions.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = important historical events with a tricky angle, $1000 = obscure treaties, secondary figures, or surprising historical facts.",
    answerFormatGuidance:
      "Answers should be a proper noun — a person, place, event, or document title.",
    examples:
      "Q: He was the first President of the United States. A: George Washington\nQ: This 1215 document limited the power of the English king. A: The Magna Carta",
    createdAt: 0,
  },
  {
    id: "lib-food-drink",
    name: "FOOD & DRINK",
    promptTemplate:
      "Generate trivia questions about food and drink: cooking techniques, global cuisines, beverages, restaurant culture, food origins, ingredient science, and culinary history. Target 7/10 difficulty — go beyond 'what's in guacamole?' Include origin stories, regional specialties, food science, and surprising ingredient facts.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = interesting food facts most foodies would know, $1000 = obscure culinary techniques, regional dishes, or food history deep cuts.",
    answerFormatGuidance:
      "Answers should be ingredient names, dish names, or cooking terms.",
    examples:
      "Q: This fruit is the main ingredient in guacamole. A: Avocado\nQ: This spice, from crocus flowers, is the most expensive by weight. A: Saffron",
    createdAt: 0,
  },
  {
    id: "lib-movies",
    name: "MOVIES",
    promptTemplate:
      "Generate trivia questions about films: directors, actors, iconic quotes, plot twists, Oscar history, box office records, behind-the-scenes facts, and film techniques. Span all decades and genres. Target 7/10 difficulty — go beyond naming the lead actor. Include specific Oscar years, production trivia, director filmographies, and surprising movie connections.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known films with a tricky angle, $1000 = indie films, specific award years, or production secrets.",
    answerFormatGuidance:
      "Answers should be movie titles, actor/director names, or character names.",
    examples:
      "Q: This 1994 film follows a man sitting on a bench telling his life story. A: Forrest Gump\nQ: This director is known for films like Inception and The Dark Knight. A: Christopher Nolan",
    createdAt: 0,
  },
  {
    id: "lib-music",
    name: "MUSIC",
    promptTemplate:
      "Generate trivia questions about music: artists, albums, songs, genres, music history, Grammy Awards, lyrics, collaborations, and music industry facts. Cover classic rock, pop, hip-hop, R&B, country, and more. Target 7/10 difficulty — go beyond 'who sang Bohemian Rhapsody?' Include specific chart records, album details, producer credits, and surprising music connections.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known music facts with a twist, $1000 = deep cuts, B-sides, specific chart records, or music theory.",
    answerFormatGuidance:
      "Answers should be artist names, song titles, or album names.",
    examples:
      "Q: This Beatles song begins with 'Is this the real life? Is this just fantasy?' A: (Trick — it's Queen) Bohemian Rhapsody\nQ: This artist released the album '21' in 2011. A: Adele",
    createdAt: 0,
  },
  {
    id: "lib-emoji-dash",
    name: "EMOJI DASH",
    promptTemplate:
      "Generate Jeopardy clues where the CLUE is a sequence of 3–5 emojis that visually represent a well-known movie title, song title, TV show, book, celebrity name, brand, phrase, or idiom. The ANSWER is what the emojis spell out. Use creative emoji combinations that capture the essence — not just literal translation. Target 7/10 difficulty: $200 = recognizable pop culture with obvious emoji mapping, $1000 = multi-word phrases or idioms where the emoji logic is tricky. Do NOT include text explanations in the clue — only the emoji sequence itself. Make sure every answer is unambiguous and widely recognizable.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = single-word or obvious two-word answers (🦁👑 = The Lion King), $1000 = idioms, multi-word phrases, or clever lateral thinking (🎸🦇💀 = Death by Rock and Roll).",
    answerFormatGuidance:
      "The CLUE must be ONLY emojis — no text. The answer is the title, name, or phrase the emojis represent.",
    examples:
      "Q: 🕷️🧑 A: Spider-Man\nQ: 🌊🏄🏻🎵 A: Surfin' USA\nQ: ❄️👸🏔️ A: Frozen\nQ: 🐟🔍 A: Finding Nemo\nQ: 💰🤫🔫 A: Money Talks",
    createdAt: 0,
  },
  {
    id: "lib-finish-the-lyric",
    name: "FINISH THE LYRIC",
    promptTemplate:
      "Generate Jeopardy clues where the clue is a well-known song lyric with the LAST word or phrase blanked out as '___'. The ANSWER is the missing word or phrase. Pull from iconic, widely-known songs spanning pop, hip-hop, rock, country, R&B, and classics from the 1970s to present. Target 7/10 difficulty — go beyond the most overplayed radio hits. Include hit songs players have heard but may not know every word. The lyric shown must be uniquely identifiable to that one song. Never use lyrics that could match multiple songs.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = chorus lines from mega-hits where most people know the words, $1000 = second verse, bridge, or pre-chorus lines that casual listeners might miss.",
    answerFormatGuidance:
      "The answer is the exact word or short phrase that completes the lyric. Keep it to 1–5 words.",
    examples:
      "Q: 'Is this the real life? Is this just ___?' A: Fantasy\nQ: 'I got 99 problems but a ___ ain't one.' A: Bitch\nQ: 'We are never ever ever getting back ___.' A: Together\nQ: 'Sweet dreams are made of ___, who am I to disagree?' A: This",
    createdAt: 0,
  },
  {
    id: "lib-slogans",
    name: "SLOGANS",
    promptTemplate:
      "Generate Jeopardy clues where the clue is a well-known advertising slogan or brand tagline, and the ANSWER is the brand or company it belongs to. Include iconic slogans from fast food, beverages, tech companies, athletic brands, cars, retail, and consumer products. Target 7/10 difficulty — go beyond 'Just Do It.' Include slogans from the 1980s–present that people have heard but might not immediately pin to a brand. Never use a slogan that could belong to more than one brand.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = iconic slogans everyone knows but may not consciously associate with the brand, $1000 = retired or regional slogans that brand loyalists would remember.",
    answerFormatGuidance:
      "The answer is the brand name — company or product name only. Keep it concise.",
    examples:
      "Q: 'Have it your way.' A: Burger King\nQ: 'Think different.' A: Apple\nQ: 'Because you're worth it.' A: L'Oréal\nQ: 'Betcha can't eat just one.' A: Lay's\nQ: 'The happiest place on Earth.' A: Disneyland",
    createdAt: 0,
  },
  {
    id: "lib-tv-shows",
    name: "TV SHOWS",
    promptTemplate:
      "Generate trivia questions about television: iconic shows, episode plots, character names, catchphrases, cast members, showrunners, spinoffs, network history, ratings records, and behind-the-scenes facts. Span sitcoms, dramas, reality TV, and streaming originals from the 1970s to present. Target 7/10 difficulty — go beyond 'who played Ross on Friends?' Include specific episode titles, guest stars, writers, and surprising show connections.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known shows with a tricky angle, $1000 = specific episode facts, minor characters, or deep production trivia.",
    answerFormatGuidance:
      "Answers should be show titles, character names, or cast/crew names.",
    examples:
      "Q: This HBO drama series features a family fighting over control of a media empire. A: Succession\nQ: This was the first reality show to feature contestants voting each other off an island. A: Survivor",
    createdAt: 0,
  },
];

const LIB_KEY = "triviaMasters.categories.v1";

/** Migrate a raw stored object to the current CategoryLibraryItem shape. */
function migrateItem(raw: Record<string, unknown>): CategoryLibraryItem {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    // generationPrompt was the old field name
    promptTemplate: String(raw.promptTemplate ?? raw.generationPrompt ?? ""),
    difficultyGuidance: String(raw.difficultyGuidance ?? ""),
    answerFormatGuidance: String(raw.answerFormatGuidance ?? ""),
    examples: String(raw.examples ?? ""),
    createdAt: Number(raw.createdAt ?? 0),
  };
}

export function loadCategories(): CategoryLibraryItem[] {
  if (typeof window === "undefined") return DEFAULT_LIBRARY;
  try {
    const stored = localStorage.getItem(LIB_KEY);
    if (!stored) return DEFAULT_LIBRARY;
    const parsed = JSON.parse(stored) as Record<string, unknown>[];
    const custom = parsed.map(migrateItem);
    // Always include all defaults; append any user-created items not in the default set
    const defaultIds = new Set(DEFAULT_LIBRARY.map((d) => d.id));
    const userAdded = custom.filter((c) => !defaultIds.has(c.id));
    return [...DEFAULT_LIBRARY, ...userAdded];
  } catch {
    return DEFAULT_LIBRARY;
  }
}

export function saveCategories(items: CategoryLibraryItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIB_KEY, JSON.stringify(items));
}
