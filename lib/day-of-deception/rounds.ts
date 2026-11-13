import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToPlayer, sendPushToSession } from "@/lib/push";
import { checkWinner, livingCounts } from "@/lib/day-of-deception/endgame";
import { randomMurderMethod } from "@/lib/day-of-deception/murderMethods";

// The shape of a game, like the show. Each round:
//   1. Murder in plain sight (opens by itself from round 2; the host opens round 1's)
//   2. Breakfast: everyone checks in, then the victim is revealed
//   3. The day: events, missions, clues
//   4. Roundtable: vote, chalkboards, banish, the banished reveal themselves
// After a Traitor is banished, the rest may recruit. With 4 or fewer left,
// the Roundtable ends in the endgame vote instead.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const ENDGAME_AT = 4;

/** A line in the game's recap. Never fails the action that wrote it. */
export async function logEvent(db: Db, sessionId: string, text: string, round?: number | null) {
  try {
    await db.from("traitors_day_log").insert({ session_id: sessionId, text, round_number: round ?? null });
  } catch {
    // Log table not created yet
  }
}

async function setState(db: Db, sessionId: string, patch: Row) {
  return db
    .from("traitors_day_game_state")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId);
}

export async function finishGame(db: Db, sessionId: string, winner: "faithful" | "traitors", round?: number) {
  await setState(db, sessionId, { phase: "end", winner, roles_revealed: true, reveal_step: null, last_action: "game_ended" });
  await db.from("traitors_day_sessions").update({ status: "finished", finished_at: new Date().toISOString() }).eq("id", sessionId);
  await logEvent(db, sessionId, winner === "faithful" ? "The Faithful won." : "The Traitors won.", round);
  await sendPushToSession(db, sessionId, {
    title: winner === "faithful" ? "🛡️ The Faithful win" : "🗡️ The Traitors win",
    body: "Open the game to see who was who, and everything that happened.",
    tag: "end",
  }).catch(() => {});
}

/** The Traitors get a method and have the day to use it. One murder per round. */
export async function openMurder(db: Db, sessionId: string, gs: Row, players: Row[]): Promise<string | null> {
  const round = gs.round_number ?? 1;
  if (gs.murder_round === round) return "There's already been a murder this round";
  if (gs.murder_status === "open" || gs.murder_status === "chosen" || gs.murder_status === "breakfast") {
    return "A murder is already underway";
  }
  const { error } = await setState(db, sessionId, {
    murder_status: "open",
    murder_round: round,
    murder_victim_id: null,
    murder_by_id: null,
    murder_method: randomMurderMethod(gs.murder_method),
    last_action: "murder_open",
  });
  if (error) return "Run supabase-dod-endgame-migration.sql in Supabase first";
  await Promise.allSettled(
    players
      .filter((p) => p.role === "traitor" && !p.eliminated)
      .map((t) =>
        sendPushToPlayer(db, sessionId, t.id, {
          // Generic on purpose: lock screens are easy to glance at
          title: "🔒 Check My secret",
          body: "Make sure nobody's looking first.",
          tag: "murder",
        })
      )
  );
  return null;
}

/** Breakfast is over (or the host skipped it): the victim is out. */
export async function completeMurder(db: Db, sessionId: string, gs: Row, players: Row[]) {
  const victim = players.find((p) => p.id === gs.murder_victim_id);
  if (!victim) return;
  await db
    .from("traitors_day_players")
    .update({ eliminated: "murdered", eliminated_at: new Date().toISOString() })
    .eq("id", victim.id);
  await setState(db, sessionId, {
    murder_status: "done",
    murders_done: (gs.murders_done ?? 0) + 1,
    last_action: "murder_revealed",
  });
  await logEvent(db, sessionId, `${victim.display_name} was found murdered at breakfast.`, gs.round_number);
  await sendPushToSession(db, sessionId, {
    title: "☠️ There's been a murder",
    body: `${victim.display_name} was murdered by the Traitors.`,
    tag: "murder-revealed",
  }).catch(() => {});
}

/** Once everyone still in has checked in for breakfast, reveal the victim. */
export async function maybeFinishBreakfast(db: Db, sessionId: string) {
  const [{ data: gs }, { data: players }] = await Promise.all([
    db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
    db.from("traitors_day_players").select("*").eq("session_id", sessionId),
  ]);
  if (!gs || gs.murder_status !== "breakfast") return;
  const living = (players || []).filter((p) => !p.eliminated);
  if (living.every((p) => p.breakfast_round === gs.murder_round)) {
    // Claim it so two last check-ins can't both reveal
    const { data: claimed } = await db
      .from("traitors_day_game_state")
      .update({ murder_status: "revealing" })
      .eq("session_id", sessionId)
      .eq("murder_status", "breakfast")
      .select("session_id");
    if (claimed && claimed.length > 0) await completeMurder(db, sessionId, gs, players || []);
  }
}

/**
 * After the banished player reveals their role: someone may have won. If not,
 * a lost Traitor opens recruitment, and either the endgame vote starts (few
 * left) or the next round does, with its murder.
 */
export async function afterReveal(
  db: Db,
  session: Row,
  gs: Row,
  players: Row[],
  next: "day" | "roundtable"
): Promise<{ winner?: string; endgame?: boolean }> {
  const sessionId = session.id as string;
  const winner = checkWinner(players);
  if (winner) {
    await finishGame(db, sessionId, winner, gs.round_number);
    return { winner };
  }

  const banished = players.find((p) => p.id === gs.accused_player_id);
  const { traitors, faithful } = livingCounts(players);

  // Lost a Traitor: the rest may recruit (once per game is plenty)
  if (banished?.role === "traitor" && traitors > 0 && faithful > 1 && !gs.recruit_status) {
    await setState(db, sessionId, { recruit_status: "open", recruit_target_id: null });
    await Promise.allSettled(
      players
        .filter((p) => p.role === "traitor" && !p.eliminated)
        .map((t) =>
          sendPushToPlayer(db, sessionId, t.id, {
            title: "🔒 Check My secret",
            body: "Make sure nobody's looking first.",
            tag: "recruit",
          })
        )
    );
  }

  // Votes and shields reset every Roundtable
  await db
    .from("traitors_day_players")
    .update({ vote_target_id: null, vote_locked: false, vote_doubled: false, shield: false, endgame_vote: null })
    .eq("session_id", sessionId);

  if (traitors + faithful <= ENDGAME_AT) {
    await setState(db, sessionId, { reveal_step: "endgame", last_action: "endgame" });
    await logEvent(db, sessionId, `The endgame: ${traitors + faithful} players left.`, gs.round_number);
    await sendPushToSession(db, sessionId, {
      title: "⚖️ The endgame",
      body: "End the game, or banish again? It has to be unanimous to end.",
      tag: "endgame",
    }).catch(() => {});
    return { endgame: true };
  }

  await startRound(db, session, gs, players, next);
  return {};
}

/** Next round. The murder opens by itself, since it's one per round. */
export async function startRound(db: Db, session: Row, gs: Row, players: Row[], next: "day" | "roundtable", murder = true) {
  const sessionId = session.id as string;
  const toRoundtable = next === "roundtable";
  const round = (gs.round_number ?? 1) + 1;
  await setState(db, sessionId, {
    phase: toRoundtable ? "roundtable" : "freeplay",
    reveal_step: null,
    accused_player_id: null,
    vote_tally: null,
    round_number: round,
    timer_started_at: toRoundtable ? new Date().toISOString() : null,
    timer_duration_seconds: toRoundtable ? (session.discussion_timer_minutes ?? 10) * 60 : null,
    last_action: toRoundtable ? "roundtable_started" : "next_round",
  });
  if (murder) {
    const { data: fresh } = await db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single();
    if (fresh) await openMurder(db, sessionId, fresh, players);
  }
}

/** Everyone still in has voted end or banish. Unanimous end finishes the game. */
export async function resolveEndgame(db: Db, session: Row, gs: Row, players: Row[], force = false): Promise<string | null> {
  const living = players.filter((p) => !p.eliminated);
  const votes = living.map((p) => p.endgame_vote);
  if (!force && votes.some((v) => !v)) return null;
  const sessionId = session.id as string;
  if (votes.every((v) => v === "end")) {
    const traitorLeft = living.some((p) => p.role === "traitor");
    await logEvent(db, sessionId, "Everyone voted to end the game.", gs.round_number);
    await finishGame(db, sessionId, traitorLeft ? "traitors" : "faithful", gs.round_number);
    return "ended";
  }
  await logEvent(db, sessionId, "Not everyone was sure. Another banishment.", gs.round_number);
  // Straight to another Roundtable. No more murders in the endgame.
  await startRound(db, session, gs, players, "roundtable", false);
  return "banish";
}
