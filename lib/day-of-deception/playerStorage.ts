// Player identity for Traitors.
//
// Stored in localStorage (not sessionStorage) so a player stays in their game
// after closing the tab, locking the phone, or reopening the home screen app.
// The game runs all day, so this has to survive the app being closed.

export interface StoredPlayer {
  playerId: string;
  playerName: string;
  playerToken: string;
  /** The game's join code, so a scanned QR for this same game goes straight in */
  joinCode?: string;
}

const LAST_SESSION_KEY = "day-of-deception-last-session";

function keys(sessionId: string) {
  return {
    id: `day-of-deception-player-id-${sessionId}`,
    name: `day-of-deception-player-name-${sessionId}`,
    token: `day-of-deception-player-token-${sessionId}`,
    code: `day-of-deception-join-code-${sessionId}`,
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
    if (player.joinCode) localStorage.setItem(k.code, player.joinCode.toUpperCase());
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

  const joinCode = safe(() => localStorage.getItem(k.code), null) ?? undefined;
  const player = { playerId, playerName, playerToken, joinCode };
  savePlayer(sessionId, player); // migrate to localStorage
  return player;
}

export function clearPlayer(sessionId: string) {
  const k = keys(sessionId);
  safe(() => {
    for (const key of [k.id, k.name, k.token, k.code]) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
    if (localStorage.getItem(LAST_SESSION_KEY) === sessionId) {
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  }, undefined);
}

/** Stop auto-opening this game on launch (it ended), but keep the player so
 *  the end screen still works if they follow a link back to it. */
export function forgetLastSession(sessionId: string) {
  safe(() => {
    if (localStorage.getItem(LAST_SESSION_KEY) === sessionId) {
      localStorage.removeItem(LAST_SESSION_KEY);
    }
  }, undefined);
}

// Guard against redirect loops between the join page and the game page.
// Each automatic "send them back into their game" is recorded; if it happens
// more than twice in 30 seconds, stop and let the player tap a button instead.
const RESUME_LOG_KEY = "day-of-deception-auto-resume";

export function allowAutoResume(): boolean {
  return safe(() => {
    const now = Date.now();
    const recent = (JSON.parse(sessionStorage.getItem(RESUME_LOG_KEY) || "[]") as number[]).filter(
      (t) => now - t < 30_000
    );
    if (recent.length >= 2) return false;
    sessionStorage.setItem(RESUME_LOG_KEY, JSON.stringify([...recent, now]));
    return true;
  }, true);
}

/** The game this device last joined, if the player is still stored for it. */
export function getLastSessionId(): string | null {
  const sessionId = safe(() => localStorage.getItem(LAST_SESSION_KEY), null);
  if (!sessionId) return null;
  return loadPlayer(sessionId) ? sessionId : null;
}

/** The game on this phone with this join code, if the player is stored for it. */
export function findSessionByJoinCode(joinCode: string): string | null {
  const code = joinCode.trim().toUpperCase();
  if (!code) return null;
  return safe(() => {
    const prefix = "day-of-deception-join-code-";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && localStorage.getItem(key) === code) {
        const sessionId = key.slice(prefix.length);
        if (loadPlayer(sessionId)) return sessionId;
      }
    }
    return null;
  }, null);
}
