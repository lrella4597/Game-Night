import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { sendPushToPlayer, sendPushToSession } from "@/lib/push";
import {
  afterReveal,
  completeMurder,
  finishGame,
  logEvent,
  openMurder,
  resolveEndgame,
} from "@/lib/day-of-deception/rounds";

// Host steps. See lib/day-of-deception/rounds.ts for the shape of a round.
//   count            boards → banished (or tie)
//   force_role       banished → role, if the banished player can't tap it
//   revote           tie → voting again
//   continue         role → next round ("day" or "roundtable"), the endgame, or the end
//   end              finish now: Traitors win if any are left
//   murder_open      round 1's murder (later rounds open by themselves)
//   murder_cancel    call it off
//   breakfast        the murder's done: everyone checks in, then it's revealed
//   breakfast_now    reveal without waiting for every check-in
//   endgame_resolve  settle the endgame vote with whoever has voted
//   pause / resume   Good night / Good morning: no missions or mission timers overnight
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, action, next } = await req.json();
    const { data: session } = await db.from("traitors_day_sessions").select("*").eq("id", sessionId).single();
    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [{ data: gs }, { data: playerRows }] = await Promise.all([
      db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
      db.from("traitors_day_players").select("*").eq("session_id", sessionId),
    ]);
    if (!gs) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    const players = playerRows || [];
    const round = gs.round_number ?? 1;
    const setState = (patch: Record<string, unknown>) =>
      db
        .from("traitors_day_game_state")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("session_id", sessionId);
    const fail = (error: string) => NextResponse.json({ error }, { status: 400 });
    const ok = (extra?: Record<string, unknown>) => NextResponse.json({ success: true, ...extra });

    switch (action) {
      case "count": {
        if (gs.phase !== "reveal" || gs.reveal_step !== "boards") return fail("Not at the vote reveal");
        if (!gs.accused_player_id) {
          await setState({ reveal_step: "tie", last_action: "vote_tied" });
          return ok({ tied: true });
        }
        const { error } = await db
          .from("traitors_day_players")
          .update({ eliminated: "banished", eliminated_at: new Date().toISOString() })
          .eq("id", gs.accused_player_id);
        if (error) return fail("Run supabase-dod-endgame-migration.sql in Supabase first");
        await setState({ reveal_step: "banished", last_action: "banished" });
        const accused = players.find((p) => p.id === gs.accused_player_id);
        await logEvent(db, sessionId, `${accused?.display_name ?? "Someone"} was banished at the Roundtable.`, round);
        await sendPushToPlayer(db, sessionId, gs.accused_player_id, {
          title: "⚖️ You've been banished",
          body: "Say your piece, then reveal who you really are on your phone.",
          tag: "banished",
        }).catch(() => {});
        return ok();
      }

      case "force_role": {
        if (gs.reveal_step !== "banished") return fail("Nobody to reveal");
        await setState({ reveal_step: "role", last_action: "role_revealed" });
        return ok();
      }

      case "revote": {
        if (gs.reveal_step !== "tie") return fail("Only after a tie");
        await db.from("traitors_day_players").update({ vote_target_id: null, vote_locked: false, vote_doubled: false }).eq("session_id", sessionId);
        await setState({
          phase: "voting",
          reveal_step: null,
          accused_player_id: null,
          vote_tally: null,
          timer_started_at: new Date().toISOString(),
          timer_duration_seconds: session.voting_timer_seconds ?? 120,
          last_action: "revote",
        });
        return ok();
      }

      case "continue": {
        if (gs.reveal_step !== "role") return fail("Reveal the role first");
        return ok(await afterReveal(db, session, gs, players, next === "roundtable" ? "roundtable" : "day"));
      }

      case "end": {
        const left = players.some((p) => p.role === "traitor" && !p.eliminated);
        await finishGame(db, sessionId, left ? "traitors" : "faithful", round);
        return ok();
      }

      case "murder_open": {
        if (!["freeplay", "event_active"].includes(gs.phase)) return fail("Murders happen during the day");
        const error = await openMurder(db, sessionId, gs, players);
        return error ? fail(error) : ok();
      }

      case "murder_cancel": {
        await setState({ murder_status: null, murder_victim_id: null, murder_by_id: null, last_action: "murder_cancelled" });
        return ok();
      }

      case "breakfast": {
        if (gs.murder_status !== "chosen" || !gs.murder_victim_id) return fail("The Traitors haven't done it yet");
        if (players.find((p) => p.id === gs.murder_victim_id)?.shield) {
          // They won a shield after being got: the Traitors have to do it again
          await setState({ murder_status: "open", murder_victim_id: null, murder_by_id: null });
          return fail("That player has the shield now. The Traitors have to get someone else");
        }
        await setState({ murder_status: "breakfast", last_action: "breakfast" });
        await sendPushToSession(db, sessionId, {
          title: session.game_length === "weekend" ? "☕ Breakfast" : "🔔 Gather round",
          body: "Open the game and check in. Someone won't make it.",
          tag: "breakfast",
        }).catch(() => {});
        return ok();
      }

      case "breakfast_now": {
        if (gs.murder_status !== "breakfast") return fail("It isn't breakfast");
        await completeMurder(db, sessionId, gs, players);
        return ok();
      }

      case "endgame_resolve": {
        if (gs.reveal_step !== "endgame") return fail("Not in the endgame");
        return ok({ result: await resolveEndgame(db, session, gs, players, true) });
      }

      case "pause": {
        const { error } = await db.from("traitors_day_sessions").update({ missions_paused: true }).eq("id", sessionId);
        if (error) return fail("Run supabase-dod-endgame-migration.sql in Supabase first");
        await logEvent(db, sessionId, "Good night. The game paused overnight.", round);
        await sendPushToSession(db, sessionId, {
          title: "🌙 Good night",
          body: "The game is paused until morning. No missions overnight.",
          tag: "pause",
        }).catch(() => {});
        return ok();
      }

      case "resume": {
        await db.from("traitors_day_sessions").update({ missions_paused: false }).eq("id", sessionId);
        // Open missions get their full time back
        await db
          .from("traitors_day_missions")
          .update({ created_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .eq("is_completed", false)
          .eq("expired", false);
        await logEvent(db, sessionId, "Good morning. The game is back on.", round);
        await sendPushToSession(db, sessionId, {
          title: "☀️ Good morning",
          body: "The game is back on. Open it to catch up.",
          tag: "resume",
        }).catch(() => {});
        return ok();
      }

      default:
        return fail("Unknown action");
    }
  } catch (err) {
    console.error("Host action error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
