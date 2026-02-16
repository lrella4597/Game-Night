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
    id: "lib-science",
    name: "SCIENCE",
    promptTemplate:
      "Generate trivia questions about science topics including physics, chemistry, biology, astronomy, and earth science.",
    difficultyGuidance:
      "$100 = well-known facts (water boils at 100°C), $500 = graduate-level concepts.",
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
      "Generate trivia questions about world history, major wars, civilizations, and turning-point events.",
    difficultyGuidance:
      "$100 = famous battles/dates, $500 = obscure treaties or secondary figures.",
    answerFormatGuidance:
      "Answers should be a proper noun — a person, place, event, or document title.",
    examples:
      "Q: He was the first President of the United States. A: George Washington\nQ: This 1215 document limited the power of the English king. A: The Magna Carta",
    createdAt: 0,
  },
  {
    id: "lib-pop-culture",
    name: "POP CULTURE",
    promptTemplate:
      "Generate trivia questions about movies, TV shows, music, video games, memes, and celebrity culture.",
    difficultyGuidance:
      "$100 = blockbuster/mainstream, $500 = cult classic or deep-cut knowledge.",
    answerFormatGuidance:
      "Answers should be titles, character names, or celebrity names.",
    examples:
      "Q: This Disney princess has a glass slipper. A: Cinderella\nQ: This director made Pulp Fiction. A: Quentin Tarantino",
    createdAt: 0,
  },
  {
    id: "lib-geography",
    name: "GEOGRAPHY",
    promptTemplate:
      "Generate trivia questions about countries, capitals, physical features, and world landmarks.",
    difficultyGuidance:
      "$100 = major capitals and continents, $500 = obscure straits, islands, or borders.",
    answerFormatGuidance:
      "Answers should be place names.",
    examples:
      "Q: This is the capital of France. A: Paris\nQ: This mountain is the tallest in the world. A: Mount Everest",
    createdAt: 0,
  },
  {
    id: "lib-sports",
    name: "SPORTS",
    promptTemplate:
      "Generate trivia questions about professional sports, athletes, championships, and records.",
    difficultyGuidance:
      "$100 = hall-of-famers and basic rules, $500 = specific records or minor sports.",
    answerFormatGuidance:
      "Answers should be athlete names, team names, or numerical records.",
    examples:
      "Q: This sport uses a shuttlecock. A: Badminton\nQ: This swimmer holds the record for most Olympic gold medals. A: Michael Phelps",
    createdAt: 0,
  },
  {
    id: "lib-food-drink",
    name: "FOOD & DRINK",
    promptTemplate:
      "Generate trivia questions about food, cooking techniques, global cuisines, and beverages.",
    difficultyGuidance:
      "$100 = common ingredients and dishes, $500 = obscure culinary techniques or regional specialties.",
    answerFormatGuidance:
      "Answers should be ingredient names, dish names, or cooking terms.",
    examples:
      "Q: This fruit is the main ingredient in guacamole. A: Avocado\nQ: This spice, from crocus flowers, is the most expensive by weight. A: Saffron",
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
    return parsed.map(migrateItem);
  } catch {
    return DEFAULT_LIBRARY;
  }
}

export function saveCategories(items: CategoryLibraryItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIB_KEY, JSON.stringify(items));
}
