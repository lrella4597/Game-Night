import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToPlayer, sendPushToSession } from "@/lib/push";

// ── Clues ────────────────────────────────────────────────────────────────────
// Clues are about the game, never about anyone's life:
//   cleared      "Jess is Loyal."
//   lineup       "One of Mike, Sarah or Tom is a Deceiver."
//   mission_tip  "A Deceiver's mission was: get someone to compliment their shoes."
//
// Pacing: real clues are pooled across every player (people share), and the
// pool is never allowed to give the game away. Cleared clues stop while there
// are fewer than 2 uncleared Loyal players per Deceiver, so pooling everything
// still leaves about 3 suspects per Deceiver. Lineups always name 3 people
// with exactly one Deceiver.

// A mission has this long to be completed before it expires and everyone
// gets a public clue.
export const MISSION_WINDOW_MS = 30 * 60 * 1000;
// Mission tips only use missions old enough that the Deceiver has had time
// to act on them, so there's something to remember.
const TIP_MIN_AGE_MS = 10 * 60 * 1000;
const LINEUP_SIZE = 3;

export type ClueKind = "cleared" | "lineup" | "mission_tip";
export type ClueSource = "event" | "tip" | "public";

interface PlayerLite {
  id: string;
  display_name: string;
  role: string | null;
}

interface ClueRow {
  kind: string;
  subject_ids: string[] | null;
  mission_id: string | null;
  is_fake: boolean;
}

interface MissionLite {
  id: string;
  player_id: string;
  mission_text: string;
  created_at: string;
  expired: boolean | null;
}

export interface GeneratedClue {
  kind: ClueKind;
  text: string;
  subjectIds: string[];
  missionId: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function nameList(names: string[]): string {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

/** Everything the generator needs about a game, in one round of queries. */
export async function loadClueContext(db: Db, sessionId: string) {
  const [{ data: players }, { data: clues }, { data: missions }] = await Promise.all([
    db.from("traitors_day_players").select("id, display_name, role").eq("session_id", sessionId),
    db.from("traitors_day_clues").select("kind, subject_ids, mission_id, is_fake").eq("session_id", sessionId),
    db
      .from("traitors_day_missions")
      .select("id, player_id, mission_text, created_at, expired")
      .eq("session_id", sessionId),
  ]);
  return {
    players: (players || []) as PlayerLite[],
    clues: (clues || []) as ClueRow[],
    missions: (missions || []) as MissionLite[],
  };
}

type ClueContext = Awaited<ReturnType<typeof loadClueContext>>;

/**
 * Make one real clue for `recipientId` (or for everyone, when null), respecting
 * the pacing rules. Returns null only if the game has nothing left to give.
 */
export function generateClue(ctx: ClueContext, recipientId: string | null): GeneratedClue | null {
  const deceivers = ctx.players.filter((p) => p.role === "traitor");
  const loyal = ctx.players.filter((p) => p.role !== "traitor");
  if (deceivers.length === 0) return null;

  const real = ctx.clues.filter((c) => !c.is_fake);
  const cleared = new Set(real.filter((c) => c.kind === "cleared").flatMap((c) => c.subject_ids || []));
  const tippedMissions = new Set(real.map((c) => c.mission_id).filter(Boolean));
  const unclearedLoyal = loyal.filter((p) => !cleared.has(p.id));
  const names = Object.fromEntries(ctx.players.map((p) => [p.id, p.display_name]));

  // Candidates for each kind of clue
  const canClear = unclearedLoyal.length - 1 >= 2 * deceivers.length;
  // Don't clear someone if it would shrink an earlier lineup to one name
  const realLineups = real.filter((c) => c.kind === "lineup").map((c) => c.subject_ids || []);
  const clearable = unclearedLoyal.filter(
    (p) =>
      p.id !== recipientId &&
      realLineups.every(
        (ids) => !ids.includes(p.id) || ids.filter((id) => id !== p.id && !cleared.has(id)).length >= 2
      )
  );

  const lineupFillers = unclearedLoyal.filter((p) => p.id !== recipientId);
  const canLineup = lineupFillers.length >= LINEUP_SIZE - 1;

  const now = Date.now();
  const deceiverIds = new Set(deceivers.map((d) => d.id));
  const tippable = ctx.missions.filter(
    (m) =>
      deceiverIds.has(m.player_id) &&
      !tippedMissions.has(m.id) &&
      // A mission that expired was never done, so there's nothing to spot
      !m.expired &&
      now - new Date(m.created_at).getTime() >= TIP_MIN_AGE_MS
  );

  const options: { kind: ClueKind; weight: number }[] = [];
  if (tippable.length > 0) options.push({ kind: "mission_tip", weight: 4 });
  if (canLineup) options.push({ kind: "lineup", weight: 4 });
  if (canClear && clearable.length > 0) options.push({ kind: "cleared", weight: 3 });
  if (options.length === 0) return null;

  const total = options.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * total;
  let kind = options[0].kind;
  for (const o of options) {
    roll -= o.weight;
    if (roll <= 0) {
      kind = o.kind;
      break;
    }
  }

  if (kind === "mission_tip") {
    const m = pick(tippable);
    return {
      kind,
      text: `A Deceiver's secret mission was: "${m.mission_text}"`,
      subjectIds: [],
      missionId: m.id,
    };
  }

  if (kind === "cleared") {
    const p = pick(clearable);
    return { kind, text: `${p.display_name} is Loyal.`, subjectIds: [p.id], missionId: null };
  }

  // Lineup: one Deceiver (the one named in the fewest lineups so far) plus
  // Loyal fillers. Reuse a filler from that Deceiver's last lineup when
  // possible, so two lineups can't be crossed to pin down one person.
  const lineupsFor = (id: string) =>
    real.filter((c) => c.kind === "lineup" && (c.subject_ids || []).includes(id));
  const fewest = Math.min(...deceivers.map((d) => lineupsFor(d.id).length));
  const target = pick(deceivers.filter((d) => lineupsFor(d.id).length === fewest));

  const fillers: string[] = [];
  const previous = lineupsFor(target.id).at(-1);
  if (previous) {
    const carry = shuffle((previous.subject_ids || []).filter((id) => lineupFillers.some((f) => f.id === id)));
    if (carry[0]) fillers.push(carry[0]);
  }
  for (const f of shuffle(lineupFillers)) {
    if (fillers.length >= LINEUP_SIZE - 1) break;
    if (!fillers.includes(f.id)) fillers.push(f.id);
  }
  const subjectIds = shuffle([target.id, ...fillers]);
  return {
    kind: "lineup",
    text: `One of ${nameList(subjectIds.map((id) => names[id]))} is a Deceiver.`,
    subjectIds,
    missionId: null,
  };
}

interface SaveClueArgs {
  sessionId: string;
  playerId: string;
  clue: GeneratedClue;
  source: ClueSource;
  sourceLabel?: string | null;
  isFake?: boolean;
  fromPlayerId?: string | null;
}

async function insertClues(db: Db, rows: SaveClueArgs[]) {
  if (rows.length === 0) return;
  const { error } = await db.from("traitors_day_clues").insert(
    rows.map((r) => ({
      session_id: r.sessionId,
      player_id: r.playerId,
      kind: r.clue.kind,
      text: r.clue.text,
      source: r.source,
      source_label: r.sourceLabel ?? null,
      subject_ids: r.clue.subjectIds,
      mission_id: r.clue.missionId,
      is_fake: r.isFake ?? false,
      from_player_id: r.fromPlayerId ?? null,
    }))
  );
  if (error) throw new Error(`Failed to save clue: ${error.message}`);
}

/**
 * After an event: each winner gets their own private clue, and one random
 * player who didn't win gets an anonymous tip (so tips aren't always fake).
 */
export async function awardEventClues(
  db: Db,
  sessionId: string,
  eventName: string | null,
  winnerIds: string[]
): Promise<{ awarded: number }> {
  const ctx = await loadClueContext(db, sessionId);
  const validWinners = winnerIds.filter((id) => ctx.players.some((p) => p.id === id));
  const rows: SaveClueArgs[] = [];

  for (const id of validWinners) {
    const clue = generateClue(ctx, id);
    if (!clue) continue;
    rows.push({ sessionId, playerId: id, clue, source: "event", sourceLabel: eventName });
    // Count it before generating the next one, so pacing sees it
    ctx.clues.push({ kind: clue.kind, subject_ids: clue.subjectIds, mission_id: clue.missionId, is_fake: false });
  }

  const others = ctx.players.filter((p) => !validWinners.includes(p.id));
  if (others.length > 0) {
    const lucky = pick(others);
    const clue = generateClue(ctx, lucky.id);
    if (clue) rows.push({ sessionId, playerId: lucky.id, clue, source: "tip" });
  }

  await insertClues(db, rows);
  await Promise.allSettled(
    rows.map((r) =>
      sendPushToPlayer(db, sessionId, r.playerId, {
        title: r.source === "event" ? "🔍 You won a clue" : "🔍 You got an anonymous tip",
        body: "Open the game to see it. Keep it to yourself, or don't.",
        tag: "clue",
      })
    )
  );
  return { awarded: rows.length };
}

/**
 * A mission ran out of time: everyone gets the same public clue. Doesn't say
 * whose mission it was.
 */
export async function releasePublicClue(db: Db, sessionId: string, missionId: string): Promise<boolean> {
  // Claim the mission first so two ticks can't both release a clue for it
  const { data: claimed } = await db
    .from("traitors_day_missions")
    .update({ expired: true })
    .eq("id", missionId)
    .eq("expired", false)
    .eq("is_completed", false)
    .select("id");
  if (!claimed || claimed.length === 0) return false;

  const ctx = await loadClueContext(db, sessionId);
  // The same clue for everyone: generate without excluding anyone
  const clue = generateClue(ctx, null);
  if (!clue) return false;

  await insertClues(
    db,
    ctx.players.map((p) => ({
      sessionId,
      playerId: p.id,
      clue,
      source: "public" as const,
      sourceLabel: "A Deceiver missed a mission",
    }))
  );
  await sendPushToSession(db, sessionId, {
    title: "🔎 A Deceiver slacked off",
    body: "They missed a mission, so everyone gets a clue. Open the game.",
    tag: "public-clue",
  });
  return true;
}

/** Fake anonymous tip from a Deceiver. */
export function buildFakeClue(
  players: PlayerLite[],
  fromId: string,
  mode: "clear" | "frame",
  targetId: string
): GeneratedClue | null {
  const target = players.find((p) => p.id === targetId);
  if (!target) return null;
  if (mode === "clear") {
    return { kind: "cleared", text: `${target.display_name} is Loyal.`, subjectIds: [target.id], missionId: null };
  }
  // Frame: a lineup with the target and two random Loyal players, no Deceivers.
  // Reads exactly like a real lineup.
  const fillers = shuffle(
    players.filter((p) => p.role !== "traitor" && p.id !== targetId && p.id !== fromId)
  ).slice(0, LINEUP_SIZE - 1);
  const subjects = shuffle([target, ...fillers]);
  return {
    kind: "lineup",
    text: `One of ${nameList(subjects.map((p) => p.display_name))} is a Deceiver.`,
    subjectIds: subjects.map((p) => p.id),
    missionId: null,
  };
}

export async function sendFakeClue(
  db: Db,
  sessionId: string,
  fromId: string,
  recipientId: string,
  clue: GeneratedClue
) {
  await insertClues(db, [
    { sessionId, playerId: recipientId, clue, source: "tip", isFake: true, fromPlayerId: fromId },
  ]);
  await sendPushToPlayer(db, sessionId, recipientId, {
    title: "🔍 You got an anonymous tip",
    body: "Open the game to see it. Keep it to yourself, or don't.",
    tag: "clue",
  });
}

/** Fake tips a Deceiver can still send: one per completed mission. */
export async function fakeTipsAvailable(db: Db, sessionId: string, playerId: string): Promise<number> {
  const [{ count: done }, { count: sent }] = await Promise.all([
    db
      .from("traitors_day_missions")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("player_id", playerId)
      .eq("is_completed", true),
    db
      .from("traitors_day_clues")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("from_player_id", playerId)
      .eq("is_fake", true),
  ]);
  return Math.max(0, (done ?? 0) - (sent ?? 0));
}
