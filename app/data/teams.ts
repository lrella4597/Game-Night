export type PowerUpKey = "doubleDown" | "doubleDip" | "phoneAFriend";

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  players: string[];
  powerUps: Record<PowerUpKey, boolean>;
}

const STORAGE_KEY = "triviaMasters.teams.v1";

const DEFAULT_POWER_UPS: Record<PowerUpKey, boolean> = {
  doubleDown: false,
  doubleDip: false,
  phoneAFriend: false,
};

export const TEAM_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

export function defaultTeam(index: number): Team {
  return {
    id: `team-${Date.now()}-${index}`,
    name: `Team ${index + 1}`,
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    score: 0,
    players: [],
    powerUps: { ...DEFAULT_POWER_UPS },
  };
}

export function loadTeams(): Team[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Team[];
  } catch {
    return [];
  }
}

export function saveTeams(teams: Team[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

export function updateTeamScore(teams: Team[], teamId: string, delta: number): Team[] {
  return teams.map((t) => (t.id === teamId ? { ...t, score: t.score + delta } : t));
}

export function setTeamScore(teams: Team[], teamId: string, score: number): Team[] {
  return teams.map((t) => (t.id === teamId ? { ...t, score } : t));
}

export function togglePowerUp(teams: Team[], teamId: string, key: PowerUpKey): Team[] {
  return teams.map((t) =>
    t.id === teamId ? { ...t, powerUps: { ...t.powerUps, [key]: !t.powerUps[key] } } : t
  );
}

export function resetAllPowerUps(teams: Team[]): Team[] {
  return teams.map((t) => ({ ...t, powerUps: { ...DEFAULT_POWER_UPS } }));
}
