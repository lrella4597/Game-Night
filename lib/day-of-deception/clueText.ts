// Clue text can hold a time as [[t:<ISO>]] so each phone shows it in its own
// time zone (the server runs in UTC). Safe to import on the client.

export function timeToken(at: Date | string): string {
  const iso = typeof at === "string" ? at : at.toISOString();
  return `[[t:${iso}]]`;
}

export function formatClueText(text: string): string {
  return text.replace(/\[\[t:([^\]]+)\]\]/g, (_, iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "earlier";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  });
}

/** "event:Charades" → "Charades"; anything else → null. */
export function eventNameFromCategory(category: string | null | undefined): string | null {
  return category && category.startsWith("event:") ? category.slice(6) || "an event" : null;
}

/**
 * The price of skipping a mission: a hint that cuts the suspects roughly in
 * half without naming anyone, e.g. "a letter from A to J". Picks the split of
 * the alphabet that puts the skipper in a group closest to half the players
 * still in. Null when the group is too small for that to be fair (fewer than
 * 4 players, or no split leaves at least 2 on the skipper's side).
 */
export function skipperHint(livingNames: string[], skipperName: string): string | null {
  const initial = (n: string) => n.trim().charAt(0).toUpperCase();
  const isLetter = (c: string) => c >= "A" && c <= "Z";
  const me = initial(skipperName);
  const initials = livingNames.map(initial).filter(isLetter);
  if (!isLetter(me) || initials.length < 4) return null;

  const letters = [...new Set(initials)].sort();
  let best: { size: number; text: string } | null = null;
  // Split after each letter but the last: A..letter on one side, the rest on the other
  for (const letter of letters.slice(0, -1)) {
    const low = me <= letter;
    const size = initials.filter((c) => (c <= letter) === low).length;
    if (size < 2) continue;
    const next = String.fromCharCode(letter.charCodeAt(0) + 1);
    const text = low ? `a letter from A to ${letter}` : `a letter from ${next} to Z`;
    if (!best || Math.abs(size - initials.length / 2) < Math.abs(best.size - initials.length / 2)) {
      best = { size, text };
    }
  }
  return best ? best.text : null;
}
