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
/** Alias used by Supabase-backed board persistence. */
export type GameBoard = BoardState;

/** The canonical default row values — used as a fallback. */
export const POINT_VALUES = [100, 200, 300, 400, 500];

// ── Default board ─────────────────────────────────────────────────────────────

export const DEFAULT_BOARD_STATE: BoardState = {
  rowValues: [200, 400, 600, 800, 1000],
  columns: [
    {
      id: "name-that-year",
      title: "NAME THAT YEAR",
      categoryLibraryId: "lib-name-that-year",
      questions: [
        { id: "nty-200", value: 200, question: "The iPhone launched, the final Harry Potter book was released, and the housing market began to collapse.", answer: "2007" },
        { id: "nty-400", value: 400, question: "Obama was inaugurated, Avatar became the highest-grossing film, and Michael Jackson passed away.", answer: "2009" },
        { id: "nty-600", value: 600, question: "The Berlin Wall fell, Taylor Swift was born, and Tim Burton's Batman hit theaters.", answer: "1989" },
        { id: "nty-800", value: 800, question: "The Red Sox broke the Curse of the Bambino, Facebook launched from a Harvard dorm, and Usher's 'Yeah!' topped the charts.", answer: "2004" },
        { id: "nty-1000", value: 1000, question: "The Macarena dominated radio, Dolly the sheep was cloned, and the Summer Olympics were held in Atlanta.", answer: "1996" },
      ],
    },
    {
      id: "5th-grader",
      title: "ARE YOU SMARTER THAN A 5TH GRADER",
      categoryLibraryId: "lib-5th-grader",
      questions: [
        { id: "5th-200", value: 200, question: "How many continents are there on Earth?", answer: "7" },
        { id: "5th-400", value: 400, question: "What is the largest organ in the human body?", answer: "The skin" },
        { id: "5th-600", value: 600, question: "What type of rock is formed when molten lava cools and hardens?", answer: "Igneous rock" },
        { id: "5th-800", value: 800, question: "What is the formula for the area of a triangle?", answer: "1/2 × base × height" },
        { id: "5th-1000", value: 1000, question: "In what year was the Declaration of Independence signed?", answer: "1776" },
      ],
    },
    {
      id: "geography",
      title: "GEOGRAPHY",
      categoryLibraryId: "lib-geography",
      questions: [
        { id: "geo-200", value: 200, question: "This South American country is the largest by area.", answer: "Brazil" },
        { id: "geo-400", value: 400, question: "This African country is home to the ancient pyramids of Giza.", answer: "Egypt" },
        { id: "geo-600", value: 600, question: "This body of water is the saltiest on Earth — you can float in it effortlessly.", answer: "The Dead Sea" },
        { id: "geo-800", value: 800, question: "This is the only country that spans both Europe and Asia and has Istanbul as its largest city.", answer: "Turkey" },
        { id: "geo-1000", value: 1000, question: "This tiny European principality is the world's second-smallest country by area, famous for its casino.", answer: "Monaco" },
      ],
    },
    {
      id: "sports",
      title: "SPORTS",
      categoryLibraryId: "lib-sports",
      questions: [
        { id: "sports-200", value: 200, question: "This NBA legend wore #23 for the Chicago Bulls.", answer: "Michael Jordan" },
        { id: "sports-400", value: 400, question: "This country has won the most FIFA World Cup titles with 5 championships.", answer: "Brazil" },
        { id: "sports-600", value: 600, question: "This boxer was known as 'The Greatest' and famously said 'Float like a butterfly, sting like a bee.'", answer: "Muhammad Ali" },
        { id: "sports-800", value: 800, question: "In 2004, this MLB team broke an 86-year championship drought known as the Curse of the Bambino.", answer: "The Boston Red Sox" },
        { id: "sports-1000", value: 1000, question: "This NHL legend holds the record for most career goals with 894.", answer: "Wayne Gretzky" },
      ],
    },
    {
      id: "us-states",
      title: "US STATES",
      categoryLibraryId: "lib-us-states",
      questions: [
        { id: "us-200", value: 200, question: "Known as the 'Sunshine State', this state is home to Walt Disney World.", answer: "Florida" },
        { id: "us-400", value: 400, question: "This state's capital is Austin, and it was once an independent republic.", answer: "Texas" },
        { id: "us-600", value: 600, question: "This is the only U.S. state that borders only one other state.", answer: "Maine" },
        { id: "us-800", value: 800, question: "This state has the smallest population of any U.S. state and is home to Yellowstone.", answer: "Wyoming" },
        { id: "us-1000", value: 1000, question: "This state was the last of the original 13 colonies to ratify the Constitution, doing so in 1790.", answer: "Rhode Island" },
      ],
    },
    {
      id: "quinnipiac",
      title: "QUINNIPIAC UNIVERSITY",
      categoryLibraryId: "lib-quinnipiac",
      questions: [
        { id: "qu-200", value: 200, question: "This is the mascot of Quinnipiac University.", answer: "The Bobcat" },
        { id: "qu-400", value: 400, question: "Quinnipiac University is located in this Connecticut town.", answer: "Hamden" },
        { id: "qu-600", value: 600, question: "Quinnipiac is nationally known for this type of survey that measures public opinion on elections and policy.", answer: "The Quinnipiac Poll" },
        { id: "qu-800", value: 800, question: "These are Quinnipiac's official school colors.", answer: "Navy blue and gold" },
        { id: "qu-1000", value: 1000, question: "Quinnipiac was originally founded in 1929 under this name before being renamed.", answer: "Connecticut College of Commerce" },
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
