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
      "Generate Jeopardy clues where each clue lists exactly 4 major events that ALL happened in the SAME calendar year. The 4 events MUST span 4 different domains from this list: (1) Sports — championships, records, iconic moments; (2) Music — #1 albums, Grammy wins, iconic songs released; (3) Movies/TV — box office hits, award-winning films, iconic shows premiering; (4) Technology — product launches, inventions, tech milestones (e.g. iPhone launch, first tweet, Google founded); (5) World/Political Events — elections, wars, treaties, natural disasters; (6) Pop Culture — viral moments, celebrity events, cultural milestones; (7) Science/Space — discoveries, missions, medical breakthroughs. Each clue must use 4 DIFFERENT domains. Format: list the 4 events separated by semicolons. The ANSWER is always the year. Target 7/10 difficulty — clues should stump casual players but be gettable for trivia buffs. Vary the decades (1960s–2020s). Every event must be independently verifiable and widely recognizable. Never repeat a year across clues in the same set.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = years with mega-events most adults lived through or know well; $1000 = years where the events are real but require connecting dots across multiple domains that most people wouldn't link together.",
    answerFormatGuidance:
      "The answer must ALWAYS be a four-digit year. Nothing else.",
    examples:
      "Q: The Chicago Bulls won their 6th NBA championship; Titanic became the highest-grossing film ever; Google was founded in a garage; 'My Heart Will Go On' by Celine Dion topped the charts. A: 1998\nQ: The first iPhone was unveiled by Steve Jobs; the New York Giants upset the undefeated Patriots in the Super Bowl; Kanye West released 'Graduation'; Barry Bonds hit his record-breaking 756th home run. A: 2007\nQ: The Berlin Wall fell; Tim Burton's Batman dominated the box office; Taylor Swift was born; Nintendo released the Game Boy. A: 1989",
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
  {
    id: "lib-who-said-it",
    name: "WHO SAID IT?",
    promptTemplate:
      "Generate Jeopardy clues where the clue is a famous real-world quote, and the ANSWER is the person who said it. Pull from politicians, athletes, entertainers, historical figures, scientists, business leaders, and cultural icons. The quote must be unambiguously attributable to one person. Target 7/10 difficulty — go beyond 'I have a dream' and 'Be the change.' Include memorable lines from speeches, interviews, press conferences, and public moments that people have heard but might not be able to place.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = iconic quotes most people recognize but might not pin to the speaker; $1000 = specific interview quotes, lesser-known speeches, or lines from historical figures outside the usual canon.",
    answerFormatGuidance:
      "The answer is the full name of the person who said it.",
    examples:
      "Q: 'I'm not a businessman, I'm a business, man.' A: Jay-Z\nQ: 'Float like a butterfly, sting like a bee.' A: Muhammad Ali\nQ: 'The only thing we have to fear is fear itself.' A: Franklin D. Roosevelt\nQ: 'That's one small step for man, one giant leap for mankind.' A: Neil Armstrong",
    createdAt: 0,
  },
  {
    id: "lib-famous-firsts",
    name: "FAMOUS FIRSTS",
    promptTemplate:
      "Generate Jeopardy clues about record-breaking or historic 'firsts' in history, sports, science, pop culture, and technology. Each clue describes the achievement or the context, and the ANSWER is the person, country, team, or thing that did it first. Target 7/10 difficulty — go beyond 'first man on the moon.' Include firsts in sports records, technological milestones, entertainment history, medical breakthroughs, and surprising cultural moments.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = firsts most educated adults would know with a moment's thought; $1000 = obscure firsts in niche fields, specific 'first in a sport' records, or surprisingly late historical milestones.",
    answerFormatGuidance:
      "The answer is the name of the person, team, country, product, or event that was first.",
    examples:
      "Q: This country was the first to give women the right to vote nationally, in 1893. A: New Zealand\nQ: She was the first woman to win a Nobel Prize. A: Marie Curie\nQ: This streaming service released the first TV show to win the Emmy for Outstanding Drama. A: Netflix (House of Cards)\nQ: He was the first athlete to run a sub-4-minute mile. A: Roger Bannister",
    createdAt: 0,
  },
  {
    id: "lib-two-truths-lie",
    name: "TWO TRUTHS & A LIE",
    promptTemplate:
      "Generate Jeopardy clues in the Two Truths & A Lie format: present 3 statements labeled A, B, and C about a specific person, place, or topic. Exactly TWO statements are true and ONE is a cleverly believable lie. The ANSWER is the letter of the lie (A, B, or C) followed by the correct version. The lie should be plausible — not obviously wrong, but subtly off. All three statements should be about the same subject. Target 7/10 difficulty — the lie should fool players who half-know the subject.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = the lie is a small factual twist on a well-known truth; $1000 = all three statements sound equally plausible and require deep knowledge to sort out.",
    answerFormatGuidance:
      "Format: 'C — [the corrected true statement]'. Always include which letter is the lie and what the truth actually is.",
    examples:
      "Q: About Michael Jordan — A: He was cut from his high school varsity team as a sophomore. B: He won 6 NBA championships, all with the Chicago Bulls. C: He retired three times during his career. A: C — He retired twice (not three times)\nQ: About the Eiffel Tower — A: It was built as a temporary structure for the 1889 World's Fair. B: It's the tallest structure in Paris. C: It was originally painted blue. A: C — It was originally painted red-brown",
    createdAt: 0,
  },
  {
    id: "lib-rhyme-time",
    name: "RHYME TIME",
    promptTemplate:
      "Generate Jeopardy clues where the ANSWER is a two-word phrase in which both words rhyme (or near-rhyme). The clue is a definition or description of the rhyming phrase. The answers should be fun, clever, and widely understood. Examples of valid answers: 'Fat Cat', 'Super Trooper', 'Mellow Fellow', 'Double Trouble', 'Sad Dad', 'Legal Eagle', 'Big Wig'. Target 7/10 difficulty — the clue should make the answer feel satisfying when you get it but genuinely tricky to reach. Vary between funny/silly and clever/sophisticated.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = obvious rhyming pairs with clear clues ('An overweight feline' = Fat Cat); $1000 = abstract or multi-syllable rhyming pairs that require lateral thinking.",
    answerFormatGuidance:
      "The answer must be a two-word rhyming (or near-rhyming) phrase. Both words should be common English words.",
    examples:
      "Q: An overweight feline. A: Fat Cat\nQ: A skilled lawyer. A: Legal Eagle\nQ: An unhappy father. A: Sad Dad\nQ: A cool swimming area. A: Groovy Pool\nQ: A shady criminal organization. A: Crime Slime",
    createdAt: 0,
  },
  {
    id: "lib-before-or-after",
    name: "BEFORE OR AFTER",
    promptTemplate:
      "Generate Jeopardy clues in the 'Before or After' format: give players two notable historical events and ask 'which came first?' OR give one event and ask 'was this before or after [another event]?' The ANSWER is whichever event came first, plus optionally the year. Mix categories: tech milestones, sports records, historical events, pop culture moments, scientific discoveries. Target 7/10 difficulty — the two events should feel close in time or be in domains where people lose track of chronology. Never use events more than 1 year apart in the easy tier; the hard tier should have events that feel contemporary but have a surprising order.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = events from different decades that people should know; $1000 = events within a few years of each other where the order surprises most people.",
    answerFormatGuidance:
      "The answer is the name of the earlier event or invention, ideally with its year.",
    examples:
      "Q: Which came first — the invention of the microwave oven or the first McDonald's franchise? A: The microwave oven (1945) — McDonald's franchised in 1953\nQ: Which happened first — YouTube launching or Facebook opening to the public? A: Facebook (2004) — YouTube launched in 2005\nQ: Which came first — the moon landing or Woodstock? A: The moon landing (July 1969) — Woodstock was August 1969",
    createdAt: 0,
  },
  {
    id: "lib-movie-quotes",
    name: "MOVIE QUOTES",
    promptTemplate:
      "Generate Jeopardy clues where the clue is a famous line of dialogue from a movie, and the ANSWER is the title of that film. Pull from iconic, widely-recognized lines spanning action, drama, comedy, horror, sci-fi, and animated films from the 1950s to present. Target 7/10 difficulty — go beyond 'Here's looking at you, kid' and 'I'll be back.' Include memorable lines from beloved cult films, specific villain monologues, and character-defining moments that true movie fans would place. The quote must be unambiguously from one film.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = lines most moviegoers would recognize; $1000 = iconic lines from cult classics, supporting characters, or deep-cut moments that casual viewers would miss.",
    answerFormatGuidance:
      "The answer is the movie title only — not the character or actor.",
    examples:
      "Q: 'You can't handle the truth!' A: A Few Good Men\nQ: 'Why so serious?' A: The Dark Knight\nQ: 'To infinity and beyond!' A: Toy Story\nQ: 'I see dead people.' A: The Sixth Sense\nQ: 'Just keep swimming.' A: Finding Nemo",
    createdAt: 0,
  },
  {
    id: "lib-nicknames",
    name: "NICKNAMES",
    promptTemplate:
      "Generate Jeopardy clues where the clue gives a famous person's well-known nickname or alias, and the ANSWER is their real full name. OR the clue gives the real name and the answer is their iconic nickname. Mix athletes, musicians, politicians, historical figures, and pop culture icons. Target 7/10 difficulty — go beyond 'The King of Rock and Roll.' Include sporting legends, hip-hop monikers, royal titles, and military nicknames that people know but might not connect to the real name. Never use nicknames that belong to more than one famous person.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = very famous nicknames everyone has heard; $1000 = nicknames from historical figures, lesser-known sports legends, or real names behind iconic stage personas.",
    answerFormatGuidance:
      "The answer is the full real name of the person (or the nickname if the clue gives the real name).",
    examples:
      "Q: 'The Greatest' — this boxing legend gave himself this nickname. A: Muhammad Ali\nQ: 'Slim Shady' is the alter ego of this Detroit rapper. A: Eminem (Marshall Mathers)\nQ: 'The Iron Lady' was the nickname of this British Prime Minister. A: Margaret Thatcher\nQ: 'His Airness' — this Chicago Bulls legend soared above the competition. A: Michael Jordan",
    createdAt: 0,
  },
  {
    id: "lib-complete-the-phrase",
    name: "COMPLETE THE PHRASE",
    promptTemplate:
      "Generate Jeopardy clues where the clue is a common English idiom, proverb, or well-known phrase with the LAST word or words blanked out as '___'. The ANSWER is the missing word(s). Use widely-known expressions that people use in daily life or have heard many times. Target 7/10 difficulty — the phrase should be familiar enough that people feel it on the tip of their tongue, but not so obvious it's too easy. Mix classic proverbs, pop culture catchphrases, sports expressions, and everyday idioms.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = extremely common phrases where the missing word is instinctive; $1000 = less common proverbs, regional expressions, or phrases where multiple words feel plausible.",
    answerFormatGuidance:
      "The answer is the exact word or short phrase that completes the expression. Keep it to 1–4 words.",
    examples:
      "Q: 'Actions speak louder than ___.' A: Words\nQ: 'You can't judge a book by its ___.' A: Cover\nQ: 'The pen is mightier than the ___.' A: Sword\nQ: 'When in Rome, do as the Romans ___.' A: Do\nQ: 'Don't count your chickens before they ___.' A: Hatch",
    createdAt: 0,
  },
  {
    id: "lib-animal-kingdom",
    name: "ANIMAL KINGDOM",
    promptTemplate:
      "Generate trivia questions about animals: surprising facts, behaviors, anatomy, records, habitats, group names, and animal science. Cover mammals, reptiles, birds, insects, marine life, and exotic species. Target 7/10 difficulty — go beyond 'what's the fastest land animal?' Include counterintuitive animal facts, surprising group names (a 'murder' of crows), record holders (longest lifespan, strangest defense mechanism), and fascinating evolutionary adaptations.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = interesting animal facts most people have heard but find surprising; $1000 = specific species behaviors, obscure group names, or animal biology that would stump a biology teacher.",
    answerFormatGuidance:
      "Answers should be animal names, scientific terms, numbers, or short phrases.",
    examples:
      "Q: A group of flamingos is called a 'flamboyance', but what is a group of owls called? A: A parliament\nQ: This animal has the longest recorded lifespan of any vertebrate, living over 400 years. A: The Greenland shark\nQ: This mammal is the only one born with a fully calcified skeleton. A: The wildebeest\nQ: Octopuses have three of these — one for each gill. A: Hearts",
    createdAt: 0,
  },
  {
    id: "lib-record-breakers",
    name: "RECORD BREAKERS",
    promptTemplate:
      "Generate trivia questions about world records, Guinness records, and remarkable human/natural/sporting achievements. Cover athletic records, natural phenomena records, entertainment records, bizarre world records, and scientific extremes. Target 7/10 difficulty — go beyond 'tallest building' and 'fastest runner.' Include surprising 'most of' records, longest streaks, fastest completions, and counterintuitive extremes. Each clue should describe the record, and the answer should be the person, place, animal, or thing that holds it.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = well-known records people have heard of but may not pin to the holder; $1000 = niche, bizarre, or surprisingly obscure records that require specialized knowledge.",
    answerFormatGuidance:
      "Answers should be a name, place, country, number, or short phrase — whatever identifies the record holder.",
    examples:
      "Q: This country has won the most FIFA World Cup titles, with 5 championships. A: Brazil\nQ: She holds the record for most Grammy wins by any artist in history. A: Beyoncé\nQ: This is the world's most-visited website as of 2024. A: Google\nQ: This mountain holds the record for farthest point from Earth's center (not Everest). A: Mount Chimborazo",
    createdAt: 0,
  },
  {
    id: "lib-plot-twist",
    name: "PLOT TWIST",
    promptTemplate:
      "Generate Jeopardy clues that describe a famous plot twist, surprise ending, or shocking reveal from a movie or TV show — WITHOUT giving away the title in the clue. The ANSWER is the title of the film or show. Describe the twist from the audience's perspective ('In this film, the hero discovers the villain was his father all along'). Target 7/10 difficulty — use twists from beloved classics and modern hits that are well-known in pop culture. The clue should have enough detail to be solvable but shouldn't be so obvious it gives it away immediately.",
    difficultyGuidance:
      "Target 7/10 difficulty. $200 = twists so iconic they've become cultural shorthand; $1000 = twists from acclaimed but less mainstream films or shows, or where the twist itself is subtle.",
    answerFormatGuidance:
      "The answer is the movie or TV show title only.",
    examples:
      "Q: In this 1999 thriller, the boy who 'sees dead people' doesn't realize he is one. A: The Sixth Sense\nQ: This 1995 crime film ends with the revelation that the meek suspect telling the story IS the criminal mastermind Keyser Söze. A: The Usual Suspects\nQ: In this Star Wars film, Darth Vader reveals he is the hero's father. A: The Empire Strikes Back\nQ: In this animated film, the friendly mentor turns out to be the villain, Lotso, who has been manipulating everyone. A: Toy Story 3",
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
