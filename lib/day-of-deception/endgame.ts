// Who's still in, and has anyone won? Shared by the host and player routes.

interface P {
  role?: string | null;
  eliminated?: string | null;
}

export function livingCounts(players: P[]) {
  const living = players.filter((p) => !p.eliminated);
  const traitors = living.filter((p) => p.role === "traitor").length;
  return { traitors, faithful: living.length - traitors };
}

/** Faithful win when every Traitor is out; Traitors win once they match the Faithful. */
export function checkWinner(players: P[]): "faithful" | "traitors" | null {
  const { traitors, faithful } = livingCounts(players);
  if (traitors === 0) return "faithful";
  if (traitors >= faithful) return "traitors";
  return null;
}
