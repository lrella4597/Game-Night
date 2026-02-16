export interface FavoriteQuestion {
  id: string;
  categoryName: string;
  question: string;
  answer: string;
  value: number;
  savedAt: number;
}

const STORAGE_KEY = "TRIVIA_MASTERS_FAVORITES";

/** Simple numeric hash — safe for any unicode string. */
function hashKey(question: string, answer: string): string {
  const str = question.trim().toLowerCase() + "|||" + answer.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h));
}

export function loadFavorites(): FavoriteQuestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteQuestion[]) : [];
  } catch {
    return [];
  }
}

function persist(favs: FavoriteQuestion[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function isFavorited(question: string, answer: string): boolean {
  const id = hashKey(question, answer);
  return loadFavorites().some((f) => f.id === id);
}

export function addFavorite(data: Omit<FavoriteQuestion, "id" | "savedAt">): void {
  const id = hashKey(data.question, data.answer);
  const favs = loadFavorites();
  if (favs.some((f) => f.id === id)) return; // already saved
  persist([...favs, { ...data, id, savedAt: Date.now() }]);
}

export function removeFavorite(question: string, answer: string): void {
  const id = hashKey(question, answer);
  persist(loadFavorites().filter((f) => f.id !== id));
}

export function saveFavorites(favs: FavoriteQuestion[]): void {
  persist(favs);
}
