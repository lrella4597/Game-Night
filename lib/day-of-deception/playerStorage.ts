// Player identity for Day of Deception.
//
// Stored in localStorage (not sessionStorage) so a player stays in their game
// after closing the tab, locking the phone, or reopening the home screen app.
// The game runs all day, so this has to survive the app being closed.

export interface StoredPlayer {
  playerId: string;
  playerName: string;
  playerToken: string;
}

const LAST_SESSION_KEY = "day-of-deception-last-session";

function keys(sessionId: string) {
  return {
    id: `day-of-deception-player-id-${sessionId}`,
    name: `day-of-deception-player-name-${sessionId}`,
    token: `day-of-deception-player-token-${sessionId}`,
  };
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function savePlayer(sessionId: string, player: StoredPlayer) {
  const k = keys(sessionId);
  safe(() => {
    localStorage.setItem(k.id, player.playerId);
    localStorage.setItem(k.name, player.playerName);
    localStorage.setItem(k.token, player.playerToken);
    localStorage.setItem(LAST_SESSION_KEY, sessionId);
  }, undefined);
}

export function loadPlayer(sessionId: string): StoredPlayer | null {
  const k = keys(sessionId);
  const read = (key: string) =>
    safe(() => localStorage.getItem(key), null) ??
    // Players who joined before this change still have sessionStorage values
    safe(() => sessionStorage.getItem(key), null);

  const playerId = read(k.id);
  const playerName = read(k.name);
  const playerToken = read(k.token);
  if (!playerId || !playerName || !playerToken) return null;

  const player = { playerId, playerName, playerToken };
  savePlayer(sessionId, player); // migrate to localStorage
  return player;
}

export function clearPlayer(sessionId: string) {
  const k = keys(sessionId);
  safe(() => {
    for (const key of [k.id, k.name, k.token]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    if (localStorage.getItem(LAST_SESSION_KEY) === sessionId) {
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  }, undefined);
}

/** The game this device last joined, if the player is still stored for it. */
export function getLastSessionId(): string | null {
  const sessionId = safe(() => localStorage.getItem(LAST_SESSION_KEY), null);
  if (!sessionId) return null;
  return loadPlayer(sessionId) ? sessionId : null;
}
