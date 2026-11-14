import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { sendPushToPlayer, sendPushToSession } from "@/lib/push";
import { giftClue } from "@/lib/day-of-deception/clues";
import { randomMurderMethod } from "@/lib/day-of-deception/murderMethods";
import { logEvent, maybeFinishBreakfast, resolveEndgame } from "@/lib/day-of-deception/rounds";

// Steps only one player can take:
//   reveal_role     the banished player reveals Traitor or Faithful, like the show
//   reward_choice   an event winner takes the shield, or gives everyone a clue
//   murder_pick     a Traitor did the murder method to someone; this says who
//   murder_reroll   swap the murder method for another
//   check_in        breakfast: "I'm here"
//   endgame_vote    end the game, or banish again
//   dagger          arm (or put away) a double vote for the next Roundtable
//   truth_check     pick two players: is a Traitor among them?
//   recruit_offer   the Traitors offer someone a place
//   recruit_answer  the offered player says yes or no
// `targetId` carries the choice for actions that aren't about a player.
export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, action, targetId } = await req.json();
    if (!sessionId || !playerId || !token || !action) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const [{ data: gs }, { data: playerRows }, { data: session }] = await Promise.all([
      db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
      db.from("traitors_day_players").select("*").eq("session_id", sessionId),
      db.from("traitors_day_sessions").select("*").eq("id", sessionId).single(),
    ]);
    const players = playerRows || [];
    const me = players.find((p) => p.id === playerId);
    if (!gs || !me || !session) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    const round = gs.round_number ?? 1;
    const fail = (error: string) => NextResponse.json({ error }, { status: 400 });
    const ok = () => NextResponse.json({ success: true });
    const setState = (patch: Record<string, unknown>) =>
      db
        .from("traitors_day_game_state")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("session_id", sessionId);
    const isLivingTraitor = me.role === "traitor" && !me.eliminated;

    switch (action) {
      case "reveal_role": {
        if (gs.phase !== "reveal" || gs.reveal_step !== "banished" || gs.accused_player_id !== playerId) {
          return fail("Nothing to reveal right now");
        }
        await setState({ reveal_step: "role", last_action: "role_revealed" });
        await logEvent(db, sessionId, `${me.display_name} revealed they were ${me.role === "traitor" ? "a Traitor" : "Faithful"}.`, round);
        await sendPushToSession(db, sessionId, {
          title: me.role === "traitor" ? "🗡️ A Traitor has been caught" : "🛡️ They were Faithful",
          body: `${me.display_name} was ${me.role === "traitor" ? "a Traitor" : "Faithful"}.`,
          tag: "role-revealed",
        }).catch(() => {});
        return ok();
      }

      case "reward_choice": {
        const choice = targetId;
        if (!me.pending_choice) return fail("Nothing to choose right now");
        if (choice !== "shield" && choice !== "clue") return fail("Pick the shield or the clue");
        // Claim the choice first so a double tap can't do both
        const { data: claimed } = await db
          .from("traitors_day_players")
          .update({ pending_choice: null, ...(choice === "shield" ? { shield: true } : {}) })
          .eq("id", playerId)
          .not("pending_choice", "is", null)
          .select("id");
        if (!claimed || claimed.length === 0) return fail("Already chosen");

        if (choice === "clue") await giftClue(db, sessionId, me.display_name);
        await logEvent(
          db,
          sessionId,
          choice === "shield"
            ? `${me.display_name} won ${me.pending_choice} and took the shield.`
            : `${me.display_name} won ${me.pending_choice} and gave everyone a clue instead of the shield.`,
          round
        );
        await sendPushToSession(db, sessionId, {
          title: choice === "shield" ? `🛡️ ${me.display_name} took the shield` : `📨 ${me.display_name} chose the team`,
          body:
            choice === "shield"
              ? "They can't be banished or murdered until the next Roundtable is over."
              : "They gave up the shield, so everyone gets a real clue. Open the game.",
          tag: "choice-made",
        }).catch(() => {});
        return ok();
      }

      case "murder_pick": {
        if (!isLivingTraitor) return fail("Only Traitors still in the game can murder");
        if (gs.murder_status !== "open" && gs.murder_status !== "chosen") return fail("No murder right now");
        const target = players.find((p) => p.id === targetId);
        // Blind Traitors can go after one of their own without knowing it.
        // Refusing here would tell them who's a Traitor, so the pick stands
        // and the murder fails at breakfast instead.
        const blind = session?.traitors_know_each_other === false;
        if (!target || target.eliminated || target.id === playerId || (!blind && target.role === "traitor")) {
          return fail(blind ? "Pick another player still in the game" : "Pick a Faithful player still in the game");
        }
        if (target.shield) return fail(`${target.display_name} has the shield. Pick someone else`);
        await setState({
          murder_status: "chosen",
          murder_victim_id: targetId,
          murder_by_id: playerId,
          last_action: "murder_done",
        });
        await logEvent(
          db,
          sessionId,
          `${me.display_name} murdered ${target.display_name} in plain sight: "${gs.murder_method ?? "the method"}".`,
          round
        );
        return ok();
      }

      case "murder_reroll": {
        if (!isLivingTraitor) return fail("Only Traitors can do that");
        if (gs.murder_status !== "open") return fail("No murder to change");
        await setState({ murder_method: randomMurderMethod(gs.murder_method) });
        return ok();
      }

      case "check_in": {
        if (gs.murder_status !== "breakfast") return fail("It isn't breakfast");
        if (me.eliminated) return ok();
        await db.from("traitors_day_players").update({ breakfast_round: gs.murder_round }).eq("id", playerId);
        await maybeFinishBreakfast(db, sessionId);
        return ok();
      }

      case "endgame_vote": {
        if (gs.reveal_step !== "endgame") return fail("Not in the endgame");
        if (me.eliminated) return fail("You're out, so you don't vote");
        if (targetId !== "end" && targetId !== "banish") return fail("End, or banish again?");
        await db.from("traitors_day_players").update({ endgame_vote: targetId }).eq("id", playerId);
        const fresh = players.map((p) => (p.id === playerId ? { ...p, endgame_vote: targetId } : p));
        await resolveEndgame(db, session, gs, fresh);
        return ok();
      }

      case "dagger": {
        if (me.eliminated) return fail("You're out of the game");
        if ((me.daggers ?? 0) < 1) return fail("You don't have a double vote");
        await db.from("traitors_day_players").update({ dagger_armed: targetId === "on" }).eq("id", playerId);
        return ok();
      }

      // Pick two players: is a Traitor among them? The answer is a private clue.
      case "truth_check": {
        if (me.eliminated) return fail("You're out of the game");
        if ((me.truth_checks ?? 0) < 1) return fail("You don't have a truth check");
        const ids = String(targetId ?? "").split(",").filter(Boolean);
        const picked = players.filter((p) => ids.includes(p.id) && p.id !== playerId);
        if (ids.length !== 2 || picked.length !== 2) return fail("Pick two other players");
        // Claim the check first so a double tap can't use two
        const { data: claimed } = await db
          .from("traitors_day_players")
          .update({ truth_checks: (me.truth_checks ?? 1) - 1 })
          .eq("id", playerId)
          .eq("truth_checks", me.truth_checks)
          .select("id");
        if (!claimed || claimed.length === 0) return fail("Try again");
        const [a1, a2] = picked;
        const hit = picked.some((p) => p.role === "traitor");
        const text = hit
          ? `Truth check: at least one of ${a1.display_name} and ${a2.display_name} is a Traitor.`
          : `Truth check: neither ${a1.display_name} nor ${a2.display_name} is a Traitor.`;
        await db.from("traitors_day_clues").insert({
          session_id: sessionId,
          player_id: playerId,
          kind: "truth_check",
          text,
          source: "event",
          source_label: "a truth check",
          subject_ids: picked.map((p) => p.id),
          is_fake: false,
        });
        await logEvent(db, sessionId, `${me.display_name} used a truth check on ${a1.display_name} and ${a2.display_name}.`, round);
        return NextResponse.json({ success: true, text });
      }

      case "recruit_offer": {
        if (!isLivingTraitor) return fail("Only Traitors can recruit");
        if (gs.recruit_status !== "open") return fail("You can't recruit right now");
        const target = players.find((p) => p.id === targetId);
        const blind = session?.traitors_know_each_other === false;
        if (!target || target.eliminated || target.id === playerId || (!blind && target.role === "traitor")) {
          return fail(blind ? "Pick another player still in the game" : "Pick a Faithful player still in the game");
        }
        // Blind Traitors offered a place to one of their own: it counts as a
        // "no", exactly what a Faithful turning them down looks like
        if (target.role === "traitor") {
          await setState({ recruit_status: "done", recruit_target_id: targetId, last_action: "recruit_refused" });
          await logEvent(db, sessionId, `The Traitors tried to recruit ${target.display_name}, who was already one of them.`, round);
          return ok();
        }
        // Claim it so two Traitors can't each send an offer
        const { data: claimed } = await db
          .from("traitors_day_game_state")
          .update({ recruit_status: "offered", recruit_target_id: targetId, updated_at: new Date().toISOString() })
          .eq("session_id", sessionId)
          .eq("recruit_status", "open")
          .select("session_id");
        if (!claimed || claimed.length === 0) return fail("Someone already sent an offer");
        await db.from("traitors_day_players").update({ recruit_offer: true }).eq("id", targetId);
        await logEvent(db, sessionId, `The Traitors tried to recruit ${target.display_name}.`, round);
        await sendPushToPlayer(db, sessionId, targetId, {
          title: "🔒 Check My secret",
          body: "Make sure nobody's looking first.",
          tag: "secret",
        }).catch(() => {});
        return ok();
      }

      case "recruit_answer": {
        if (!me.recruit_offer || gs.recruit_target_id !== playerId) return fail("No offer to answer");
        const yes = targetId === "yes";
        await db
          .from("traitors_day_players")
          .update({ recruit_offer: false, ...(yes ? { role: "traitor" } : {}) })
          .eq("id", playerId);
        await setState({ recruit_status: "done", last_action: yes ? "recruited" : "recruit_refused" });
        await logEvent(
          db,
          sessionId,
          yes ? `${me.display_name} joined the Traitors.` : `${me.display_name} turned the Traitors down.`,
          round
        );
        const traitors = players.filter((p) => p.role === "traitor" && !p.eliminated);
        await Promise.allSettled(
          traitors.map((t) =>
            sendPushToPlayer(db, sessionId, t.id, {
              title: "🔒 Check My secret",
              body: "Make sure nobody's looking first.",
              tag: "recruit-answer",
            })
          )
        );
        return ok();
      }

      default:
        return fail("Unknown action");
    }
  } catch (err) {
    console.error("Player action error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
