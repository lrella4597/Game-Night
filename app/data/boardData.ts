// ── Core types ────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  question: string;
  answer: string;
  value: number;
}

export interface Category {
  id: string;
  title: string;
  /** Links this board column to a saved category in the library. */
  categoryLibraryId: string | null;
  questions: Question[];
}

/**
 * Full board state.
 * `rowValues` defines the point-value rows (e.g. [100, 200, 300, 400, 500]).
 * `columns` are the category columns.
 */
export interface BoardState {
  rowValues: number[];
  columns: Category[];
}

/** The canonical default row values — used as a fallback. */
export const POINT_VALUES = [100, 200, 300, 400, 500];

// ── Default board ─────────────────────────────────────────────────────────────

export const DEFAULT_BOARD_STATE: BoardState = {
  rowValues: [100, 200, 300, 400, 500],
  columns: [
    {
      id: "science",
      title: "SCIENCE",
      categoryLibraryId: "lib-science",
      questions: [
        { id: "science-100", value: 100, question: "This is the chemical symbol for water.", answer: "H₂O" },
        { id: "science-200", value: 200, question: "This planet is known as the Red Planet.", answer: "Mars" },
        { id: "science-300", value: 300, question: "This scientist developed the theory of general relativity.", answer: "Albert Einstein" },
        { id: "science-400", value: 400, question: "This is the powerhouse of the cell.", answer: "The mitochondria" },
        { id: "science-500", value: 500, question: "This subatomic particle has a negative charge and orbits the nucleus.", answer: "Electron" },
      ],
    },
    {
      id: "history",
      title: "HISTORY",
      categoryLibraryId: "lib-history",
      questions: [
        { id: "history-100", value: 100, question: "This war was fought between the North and South in the U.S.", answer: "The Civil War" },
        { id: "history-200", value: 200, question: "He was the first President of the United States.", answer: "George Washington" },
        { id: "history-300", value: 300, question: "This ancient wonder was located in Alexandria, Egypt.", answer: "The Lighthouse of Alexandria" },
        { id: "history-400", value: 400, question: "This document, signed in 1215, limited the power of the English king.", answer: "The Magna Carta" },
        { id: "history-500", value: 500, question: "This empire, led by Genghis Khan, was the largest contiguous empire in history.", answer: "The Mongol Empire" },
      ],
    },
    {
      id: "pop-culture",
      title: "POP CULTURE",
      categoryLibraryId: "lib-pop-culture",
      questions: [
        { id: "pop-culture-100", value: 100, question: "This Disney princess has a glass slipper.", answer: "Cinderella" },
        { id: "pop-culture-200", value: 200, question: "This boy wizard attends Hogwarts School of Witchcraft and Wizardry.", answer: "Harry Potter" },
        { id: "pop-culture-300", value: 300, question: 'This TV show featured the catchphrase "How you doin\'?"', answer: "Friends" },
        { id: "pop-culture-400", value: 400, question: "This singer released the album 'Thriller' in 1982.", answer: "Michael Jackson" },
        { id: "pop-culture-500", value: 500, question: 'This film franchise features Dom Toretto and the phrase "family".', answer: "Fast & Furious" },
      ],
    },
    {
      id: "geography",
      title: "GEOGRAPHY",
      categoryLibraryId: "lib-geography",
      questions: [
        { id: "geography-100", value: 100, question: "This is the capital city of France.", answer: "Paris" },
        { id: "geography-200", value: 200, question: "This is the longest river in the world.", answer: "The Nile" },
        { id: "geography-300", value: 300, question: "This country is both a continent and a country.", answer: "Australia" },
        { id: "geography-400", value: 400, question: "This mountain is the tallest in the world.", answer: "Mount Everest" },
        { id: "geography-500", value: 500, question: "This strait separates Europe from Africa at the western end of the Mediterranean.", answer: "Strait of Gibraltar" },
      ],
    },
    {
      id: "sports",
      title: "SPORTS",
      categoryLibraryId: "lib-sports",
      questions: [
        { id: "sports-100", value: 100, question: "This sport uses a shuttlecock.", answer: "Badminton" },
        { id: "sports-200", value: 200, question: "This country has won the most FIFA World Cup titles (5 times).", answer: "Brazil" },
        { id: "sports-300", value: 300, question: "This athlete holds the record for most Olympic gold medals ever.", answer: "Michael Phelps" },
        { id: "sports-400", value: 400, question: "In baseball, this is called when a batter strikes out.", answer: "A strikeout (K)" },
        { id: "sports-500", value: 500, question: "This tennis player won 23 Grand Slam titles, the most in women's singles history.", answer: "Serena Williams" },
      ],
    },
    {
      id: "food-drink",
      title: "FOOD & DRINK",
      categoryLibraryId: "lib-food-drink",
      questions: [
        { id: "food-drink-100", value: 100, question: "This fruit is the main ingredient in guacamole.", answer: "Avocado" },
        { id: "food-drink-200", value: 200, question: "This Japanese condiment is made from fermented soybeans.", answer: "Miso" },
        { id: "food-drink-300", value: 300, question: "This spice, derived from crocus flowers, is the most expensive by weight.", answer: "Saffron" },
        { id: "food-drink-400", value: 400, question: "This country is the world's largest producer of coffee.", answer: "Brazil" },
        { id: "food-drink-500", value: 500, question: "This French cooking technique involves vacuum-sealing food and cooking it in a water bath.", answer: "Sous vide" },
      ],
    },
  ],
};

// ── Normalization helpers ──────────────────────────────────────────────────────

/** Snap a value to the nearest entry in the given rowValues array. */
function closestRowValue(value: number, rowValues: number[]): number {
  if (rowValues.length === 0) return value;
  return rowValues.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

/**
 * Ensure every column has exactly one question per rowValue.
 * - Invalid values are snapped to the nearest rowValue.
 * - Duplicates are reassigned to unused slots (ascending order).
 * - Missing slots are filled with placeholder questions.
 */
export function normalizeBoard(state: BoardState): BoardState {
  const { rowValues } = state;

  const columns = state.columns.map((col) => {
    // Step 1: snap each question to a valid rowValue
    const snapped = col.questions.map((q) => ({
      ...q,
      value: closestRowValue(q.value, rowValues),
    }));

    // Step 2: resolve duplicates
    const seen = new Set<number>();
    const presentValues = new Set(snapped.map((q) => q.value));
    const available = rowValues.filter((v) => !presentValues.has(v));

    const resolved = snapped.map((q) => {
      if (!seen.has(q.value)) {
        seen.add(q.value);
        return q;
      }
      const replacement = available.shift() ?? q.value;
      seen.add(replacement);
      return { ...q, value: replacement };
    });

    // Step 3: fill missing rowValues with placeholders
    const resolvedSet = new Set(resolved.map((q) => q.value));
    const placeholders: Question[] = rowValues
      .filter((v) => !resolvedSet.has(v))
      .map((v) => ({
        id: `${col.id}-${v}`,
        value: v,
        question: "(placeholder) click to edit",
        answer: "",
      }));

    return { ...col, questions: [...resolved, ...placeholders] };
  });

  return { ...state, columns };
}

// ── Persistence ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "trivia-masters-board";

/** Detect and migrate the old format (bare Category[]) to BoardState. */
function ensureBoardState(data: unknown): BoardState {
  if (Array.isArray(data)) {
    // Old format: Category[] — wrap it
    return { rowValues: POINT_VALUES, columns: data as Category[] };
  }
  if (
    data &&
    typeof data === "object" &&
    "columns" in data &&
    "rowValues" in data
  ) {
    return data as BoardState;
  }
  return DEFAULT_BOARD_STATE;
}

export function loadBoard(): BoardState {
  if (typeof window === "undefined") return DEFAULT_BOARD_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_BOARD_STATE;
    return normalizeBoard(ensureBoardState(JSON.parse(stored)));
  } catch {
    return DEFAULT_BOARD_STATE;
  }
}

export function saveBoard(state: BoardState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
