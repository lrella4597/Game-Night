import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToPlayer, sendPushToSession } from "@/lib/push";
import { eventNameFromCategory, timeToken } from "@/lib/day-of-deception/clueText";

// ── Clues ────────────────────────────────────────────────────────────────────
// Clues never name anyone. They tell you what the Traitors were told to do,
// so the Roundtable is about who you saw doing it:
//   mission_live     Right now, a Traitor is trying to: "get 3 people to clap"
//   mission_done     A Traitor pulled this off: "move someone's drink"
//   mission_time     A Traitor finished a secret mission at 3:42 PM.
//   event_objective  In Charades, a Traitor's secret objective was: "..."
//   mission_missed   (public) A Traitor ran out of time on: "..."
//   mission_count    The Traitors have pulled off 3 secret missions so far.
//   murder_method    Jess was murdered in plain sight: someone tossed them an apple.
//
// Where clues go:
//   * Event winners each get a private clue. Always real. Or, when the host
//     puts a shield on the line, each winner chooses: the shield, or a real
//     clue for everyone (giftClue). Everyone is told which they picked.
//   * After each event, one anonymous tip goes to EVERYONE.
//   * A missed mission releases a public clue about that mission.

// A mission has this long to be completed before it expires and everyone
// gets a public clue.
export const MISSION_WINDOW_MS = 30 * 60 * 1000;
// "Right now a Traitor is trying to..." only once the Traitor has had a few
// minutes with it, so there's something to spot.
const LIVE_MIN_AGE_MS = 5 * 60 * 1000;

export type ClueKind =
  | "mission_live"
  | "mission_done"
  | "mission_time"
  | "event_objective"
  | "mission_missed"
  | "mission_count"
  | "murder_method";
export type ClueSource = "event" | "tip" | "public";

interface PlayerLite {
  id: string;
  display_name: string;
  role: string | null;
}

interface ClueRow {
  kind: string;
  text?: string;
  mission_id: string | null;
  is_fake: boolean;
}

interface MissionLite {
  id: string;
  player_id: string;
  mission_text: string;
  mission_category: string | null;
  created_at: string;
  completed_at: string | null;
  is_completed: boolean | null;
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Everything the generator needs about a game, in one round of queries. */
export async function loadClueContext(db: Db, sessionId: string) {
  const [{ data: players }, { data: clues }, { data: missions }, { data: gs }] = await Promise.all([
    db.from("traitors_day_players").select("id, display_name, role").eq("session_id", sessionId),
    db.from("traitors_day_clues").select("kind, text, mission_id, is_fake").eq("session_id", sessionId),
    db
      .from("traitors_day_missions")
      .select("id, player_id, mission_text, mission_category, created_at, completed_at, is_completed, expired")
      .eq("session_id", sessionId),
    db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).maybeSingle(),
  ]);
  const playerList = (players || []) as PlayerLite[];
  // The last murder, once announced: how it was done is a clue
  const murder =
    gs?.murder_status === "done" && gs?.murder_method && gs?.murder_victim_id
      ? {
          method: gs.murder_method as string,
          victimName: playerList.find((p) => p.id === gs.murder_victim_id)?.display_name ?? "The victim",
        }
      : null;
  return {
    players: playerList,
    clues: (clues || []) as ClueRow[],
    missions: (missions || []) as MissionLite[],
    murder,
  };
}

type ClueContext = Awaited<ReturnType<typeof loadClueContext>>;

/**
 * Make one real clue. `justEnded` is the event that just finished, so its
 * secret objective is the most likely clue. Returns null only if a game has
 * no Traitors.
 */
export function generateClue(ctx: ClueContext, justEnded?: string | null): GeneratedClue | null {
  const traitorIds = new Set(ctx.players.filter((p) => p.role === "traitor").map((p) => p.id));
  if (traitorIds.size === 0) return null;

  const real = ctx.clues.filter((c) => !c.is_fake);
  // A mission's "what" (live, done or missed) is only told once, and so is its time
  const toldWhat = new Set(
    real
      .filter((c) => ["mission_live", "mission_done", "mission_missed", "event_objective"].includes(c.kind))
      .map((c) => c.mission_id)
  );
  const toldTime = new Set(real.filter((c) => c.kind === "mission_time").map((c) => c.mission_id));

  const now = Date.now();
  const mine = ctx.missions.filter((m) => traitorIds.has(m.player_id));
  const regular = mine.filter((m) => !eventNameFromCategory(m.mission_category));

  const live = regular.filter(
    (m) =>
      !m.is_completed &&
      !m.expired &&
      !toldWhat.has(m.id) &&
      now - new Date(m.created_at).getTime() >= LIVE_MIN_AGE_MS
  );
  const done = regular.filter((m) => m.is_completed && !toldWhat.has(m.id));
  const timed = mine.filter((m) => m.is_completed && m.completed_at && !toldTime.has(m.id));

  // Event objectives: every Traitor gets the same one, so tell each text once
  const toldObjectiveTexts = new Set(
    mine.filter((m) => toldWhat.has(m.id) && eventNameFromCategory(m.mission_category)).map((m) => m.mission_text)
  );
  const objectives: MissionLite[] = [];
  for (const m of mine) {
    if (!eventNameFromCategory(m.mission_category)) continue;
    if (toldObjectiveTexts.has(m.mission_text)) continue;
    if (objectives.some((o) => o.mission_text === m.mission_text)) continue;
    objectives.push(m);
  }
  const fresh = justEnded ? objectives.filter((m) => eventNameFromCategory(m.mission_category) === justEnded) : [];

  const murderText = ctx.murder
    ? `${ctx.murder.victimName} was murdered in plain sight. The Traitors had to: "${ctx.murder.method}". Who did that?`
    : null;
  const murderTold = !!murderText && real.some((c) => c.kind === "murder_method" && c.text === murderText);

  const options: { kind: ClueKind; weight: number }[] = [];
  if (murderText && !murderTold) options.push({ kind: "murder_method", weight: 5 });
  if (fresh.length > 0) options.push({ kind: "event_objective", weight: 6 });
  else if (objectives.length > 0) options.push({ kind: "event_objective", weight: 2 });
  if (live.length > 0) options.push({ kind: "mission_live", weight: 4 });
  if (done.length > 0) options.push({ kind: "mission_done", weight: 4 });
  if (timed.length > 0) options.push({ kind: "mission_time", weight: 3 });

  if (options.length === 0) {
    const n = mine.filter((m) => m.is_completed).length;
    const text =
      n === 0
        ? "The Traitors haven't pulled off a single secret mission yet. Watch for who starts acting different."
        : `The Traitors have pulled off ${n} secret mission${n === 1 ? "" : "s"} so far.`;
    return { kind: "mission_count", text, subjectIds: [], missionId: null };
  }

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

  if (kind === "murder_method" && murderText) {
    return { kind, text: murderText, subjectIds: [], missionId: null };
  }
  if (kind === "event_objective") {
    const m = pick(fresh.length > 0 ? fresh : objectives);
    const event = eventNameFromCategory(m.mission_category);
    return {
      kind,
      text: `In ${event}, a Traitor's secret objective was: "${m.mission_text}"`,
      subjectIds: [],
      missionId: m.id,
    };
  }
  if (kind === "mission_live") {
    const m = pick(live);
    return { kind, text: `Right now, a Traitor is trying to: "${m.mission_text}"`, subjectIds: [], missionId: m.id };
  }
  if (kind === "mission_done") {
    const m = pick(done);
    return { kind, text: `A Traitor pulled this off: "${m.mission_text}"`, subjectIds: [], missionId: m.id };
  }
  const m = pick(timed);
  return {
    kind: "mission_time",
    text: `A Traitor finished a secret mission at ${timeToken(m.completed_at as string)}. Who was up to something then?`,
    subjectIds: [],
    missionId: m.id,
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

function remember(ctx: ClueContext, clue: GeneratedClue) {
  ctx.clues.push({ kind: clue.kind, text: clue.text, mission_id: clue.missionId, is_fake: false });
}

export type EventReward = "clue" | "choice" | "dagger" | "truth";

/**
 * After an event, what the winners get:
 *   clue    a private clue each
 *   choice  the shield for themselves, or a clue for everyone
 *   dagger  a double vote for a Roundtable of their choosing
 *   truth   a truth check: pick two players, learn if a Traitor is among them
 * Then one anonymous tip goes to everyone.
 */
export async function awardEventClues(
  db: Db,
  sessionId: string,
  eventName: string | null,
  winnerIds: string[],
  reward: EventReward = "clue"
): Promise<{ awarded: number }> {
  const ctx = await loadClueContext(db, sessionId);
  const validWinners = winnerIds.filter((id) => ctx.players.some((p) => p.id === id));
  const rows: SaveClueArgs[] = [];

  // Powers: a double vote or a truth check, kept secret in My secret
  if ((reward === "dagger" || reward === "truth") && validWinners.length > 0) {
    const { data: rows } = await db.from("traitors_day_players").select("*").in("id", validWinners);
    for (const r of rows || []) {
      const patch = reward === "dagger" ? { daggers: (r.daggers ?? 0) + 1 } : { truth_checks: (r.truth_checks ?? 0) + 1 };
      const { error } = await db.from("traitors_day_players").update(patch).eq("id", r.id);
      if (error) throw new Error("Run supabase-dod-endgame-migration.sql in Supabase first");
    }
    await Promise.allSettled(
      validWinners.map((id) =>
        sendPushToPlayer(db, sessionId, id, {
          title: "🔒 Check My secret",
          body: "You won something. Make sure nobody's looking first.",
          tag: "secret",
        })
      )
    );
  }

  if (reward === "choice" && validWinners.length > 0) {
    const { error } = await db
      .from("traitors_day_players")
      .update({ pending_choice: eventName ?? "the event" })
      .in("id", validWinners);
    if (error) throw new Error("Run supabase-dod-endgame-migration.sql in Supabase first");
    await Promise.allSettled(
      validWinners.map((id) =>
        sendPushToPlayer(db, sessionId, id, {
          title: "🛡️ You won. Now choose",
          body: "Take the shield for yourself, or give everyone a clue. They'll all know which.",
          tag: "choice",
        })
      )
    );
  }

  for (const id of reward === "clue" ? validWinners : []) {
    const clue = generateClue(ctx, eventName);
    if (!clue) continue;
    rows.push({ sessionId, playerId: id, clue, source: "event", sourceLabel: eventName });
    remember(ctx, clue);
  }

  const tip = generateClue(ctx, eventName);
  if (tip) {
    for (const p of ctx.players) rows.push({ sessionId, playerId: p.id, clue: tip, source: "tip" });
  }

  await insertClues(db, rows);
  await Promise.allSettled(
    (reward === "clue" ? validWinners : []).map((id) =>
      sendPushToPlayer(db, sessionId, id, {
        title: "🔍 You won a clue",
        body: "Open the game to see it. Keep it to yourself, or don't.",
        tag: "clue",
      })
    )
  );
  if (tip) {
    await sendPushToSession(db, sessionId, {
      title: "📨 New anonymous tip",
      body: "Everyone got the same one. Open the game.",
      tag: "tip",
    }).catch(() => {});
  }
  return { awarded: rows.length };
}

/** A winner picked the team over the shield: one real clue for everyone. */
export async function giftClue(db: Db, sessionId: string, fromName: string): Promise<boolean> {
  const ctx = await loadClueContext(db, sessionId);
  const clue = generateClue(ctx);
  if (!clue) return false;
  await insertClues(
    db,
    ctx.players.map((p) => ({
      sessionId,
      playerId: p.id,
      clue,
      source: "public" as const,
      sourceLabel: `${fromName} gave up the shield for this`,
    }))
  );
  return true;
}

/**
 * A mission ran out of time: everyone learns what that mission was. Doesn't
 * say whose it was.
 */
export async function releasePublicClue(db: Db, sessionId: string, missionId: string): Promise<boolean> {
  // Claim the mission first so two ticks can't both release a clue for it
  const { data: claimed } = await db
    .from("traitors_day_missions")
    .update({ expired: true })
    .eq("id", missionId)
    .eq("expired", false)
    .eq("is_completed", false)
    .select("id, mission_text, mission_category");
  if (!claimed || claimed.length === 0) return false;
  const mission = claimed[0] as { id: string; mission_text: string; mission_category: string | null };

  const { data: players } = await db.from("traitors_day_players").select("id").eq("session_id", sessionId);
  const event = eventNameFromCategory(mission.mission_category);
  const clue: GeneratedClue = {
    kind: "mission_missed",
    text: event
      ? `In ${event}, a Traitor never pulled off their secret objective: "${mission.mission_text}"`
      : `A Traitor ran out of time on this mission: "${mission.mission_text}". Who looked like they were trying?`,
    subjectIds: [],
    missionId: mission.id,
  };

  await insertClues(
    db,
    (players || []).map((p) => ({
      sessionId,
      playerId: p.id as string,
      clue,
      source: "public" as const,
      sourceLabel: "A Traitor missed a mission",
    }))
  );
  await sendPushToSession(db, sessionId, {
    title: "🔎 A Traitor slacked off",
    body: "They missed a mission, so everyone gets a clue. Open the game.",
    tag: "public-clue",
  });
  return true;
}
