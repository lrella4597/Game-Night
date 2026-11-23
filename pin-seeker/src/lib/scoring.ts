export function scoreName(strokes: number, par: number): string {
  if (strokes === 1) return "Hole in one!";
  const diff = strokes - par;
  if (diff <= -3) return "Albatross!";
  if (diff === -2) return "Eagle!";
  if (diff === -1) return "Birdie!";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double bogey";
  return `+${diff}`;
}

export function formatToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

export function parseToPar(s: string | null): number | null {
  if (s == null) return null;
  const t = s.trim().replace("−", "-");
  if (t.toUpperCase() === "E") return 0;
  const n = Number(t);
  return Number.isInteger(n) && Math.abs(n) <= 60 ? n : null;
}

export function scoreColor(strokes: number, par: number) {
  const d = strokes - par;
  if (strokes === 1 || d <= -2) return "#a855f7";
  if (d === -1) return "#3b82f6";
  if (d === 0) return "#22c55e";
  if (d === 1) return "#eab308";
  return "#ef4444";
}

export function scoreEmoji(strokes: number, par: number) {
  const d = strokes - par;
  if (strokes === 1 || d <= -2) return "🟪";
  if (d === -1) return "🟦";
  if (d === 0) return "🟩";
  if (d === 1) return "🟨";
  return "🟥";
}
