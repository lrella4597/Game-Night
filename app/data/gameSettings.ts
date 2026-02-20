export type PointMode = "classic" | "flat";
export type GameMode = "manual" | "ai";

export interface GameSettings {
  mode: GameMode;
  questionTimerSeconds: number;
  stealTimerSeconds: number;
  pointMode: PointMode;
  flatPointValue: number;
}

const STORAGE_KEY = "triviaMasters.gameSettings.v1";

export const DEFAULT_SETTINGS: GameSettings = {
  mode: "ai",
  questionTimerSeconds: 45,
  stealTimerSeconds: 10,
  pointMode: "classic",
  flatPointValue: 100,
};

export function loadGameSettings(): GameSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function setMode(mode: GameMode): void {
  saveGameSettings({ ...loadGameSettings(), mode });
}
