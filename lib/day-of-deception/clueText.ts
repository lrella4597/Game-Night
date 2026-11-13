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
