export interface FactCheckResult {
  verdict: "likely_correct" | "uncertain" | "likely_incorrect";
  confidence: number;
  explanation: string;
  supporting_facts: string[];
  common_confusions?: string[];
}

interface CacheEntry {
  key: string;
  result: FactCheckResult;
  cachedAt: number;
}

const STORAGE_KEY = "TRIVIA_MASTERS_FACTCHECK_CACHE";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashKey(question: string, answer: string): string {
  const str = question.trim().toLowerCase() + "|||" + answer.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return String(Math.abs(h));
}

function loadCache(): CacheEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CacheEntry[]) : [];
  } catch {
    return [];
  }
}

function persistCache(entries: CacheEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getCachedFactCheck(question: string, answer: string): FactCheckResult | null {
  const key = hashKey(question, answer);
  const now = Date.now();
  const entry = loadCache().find((e) => e.key === key);
  if (!entry) return null;
  if (now - entry.cachedAt > TTL_MS) return null; // expired
  return entry.result;
}

export function setCachedFactCheck(question: string, answer: string, result: FactCheckResult): void {
  const key = hashKey(question, answer);
  const cache = loadCache().filter((e) => e.key !== key); // remove old entry
  persistCache([...cache, { key, result, cachedAt: Date.now() }]);
}

export function clearFactCheckCache(): void {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}
