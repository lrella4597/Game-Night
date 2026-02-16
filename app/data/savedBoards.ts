import type { BoardState } from "./boardData";

export interface SavedBoard {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  board: BoardState;
}

const STORAGE_KEY = "TRIVIA_MASTERS_SAVED_BOARDS";

export function loadSavedBoards(): SavedBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedBoard[]) : [];
  } catch {
    return [];
  }
}

function persist(boards: SavedBoard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
}

export function saveNamedBoard(board: BoardState, name: string): SavedBoard {
  const boards = loadSavedBoards();
  const entry: SavedBoard = {
    id: `board-${Date.now()}`,
    name: name.trim() || "Untitled Board",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    board,
  };
  persist([...boards, entry]);
  return entry;
}

export function updateSavedBoard(id: string, board: BoardState): void {
  const boards = loadSavedBoards().map((b) =>
    b.id === id ? { ...b, board, updatedAt: Date.now() } : b
  );
  persist(boards);
}

export function deleteSavedBoard(id: string): void {
  persist(loadSavedBoards().filter((b) => b.id !== id));
}
