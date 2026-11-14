import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { EVENT_TEMPLATES } from "@/lib/day-of-deception/events";

// Snapshot of the game for one player, so a phone that was closed or asleep
// can pick up exactly where the game is now instead of waiting in the lobby
// for the next live broadcast. isHost tells the host's own player screen to
// show the host controls, so one phone can host and play.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const playerId = searchParams.get("playerId");
    const token = searchParams.get("token");

    if (!sessionId || !playerId || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const [{ data: session }, { data: gs }, { data: rows }, { data: authData }] = await Promise.all([
      // "*" everywhere so a column missing from the live database can't make
      // the whole query fail
      db.from("traitors_day_sessions").select("*").eq("id", sessionId).single(),
      db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
      db.from("traitors_day_players").select("*").eq("session_id", sessionId).order("joined_at", { ascending: true }),
      supabase.auth.getUser(),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const players = rows || [];
    const me = players.find((p) => p.id === playerId);
    if (!me) {
      // Kicked, or the game was reset
      return NextResponse.json({ error: "Player not in this game" }, { status: 410 });
    }
    const name = (id: string | null | undefined) => players.find((p) => p.id === id)?.display_name ?? null;
    const isHost = !!authData?.user && authData.user.id === session.host_id;

    const hasProfile = !!me.profile;
    const phase: string = gs?.phase ?? "lobby";
    const revealStep: string | null = gs?.reveal_step ?? null;
    const now = Date.now();
    const remaining = (startedAt: string | null, seconds: number | null) => {
      if (!startedAt || !seconds) return null;
      const left = Math.round((new Date(startedAt).getTime() + seconds * 1000 - now) / 1000);
      return left > 0 ? left : 0;
    };

    // Role (and fellow Traitors, only for Traitors, and only when the host
    // lets them know each other; the column is missing on older databases)
    const isTraitor = me.role === "traitor";
    const role = me.role ?? null;
    const traitorsKnown = session.traitors_know_each_other !== false;
    const deceivers = isTraitor && traitorsKnown
      ? players
          .filter((p) => p.role === "traitor" && p.id !== playerId)
          .map((p) => ({ id: p.id, displayName: p.display_name, eliminated: p.eliminated ?? null }))
      : [];

    // Active event
    const pack =
      (session.event_pack as
        | { name: string; instructions: string; durationMinutes: number; deceiverSecretMission?: string | null }[]
        | null) ?? [];
    let event: {
      eventName: string;
      instructions: string;
      durationMinutes: number;
      deceiverSecretMission?: string;
    } | null = null;
    let timerSeconds: number | null = null;

    if (phase === "event_active" && gs?.current_event_template) {
      const tpl =
        pack.find((e) => e.name === gs.current_event_template) ??
        EVENT_TEMPLATES.find((e) => e.name === gs.current_event_template);
      if (tpl) {
        event = {
          eventName: tpl.name,
          instructions: tpl.instructions,
          durationMinutes: tpl.durationMinutes,
          // Secret objective only goes to Traitors
          ...(isTraitor && tpl.deceiverSecretMission ? { deceiverSecretMission: tpl.deceiverSecretMission } : {}),
        };
      }
      timerSeconds = remaining(gs.event_started_at, gs.event_duration_seconds);
    } else if (phase === "roundtable" || phase === "voting") {
      timerSeconds = remaining(gs?.timer_started_at ?? null, gs?.timer_duration_seconds ?? null);
    }

    // ── The reveal, in the show's order ──────────────────────────────────────
    //   boards:   everyone holds up who they voted for (their own phone)
    //   banished: the banished player is named, with everyone's votes
    //   role:     the banished player has revealed whether they were a Traitor
    //   tie:      no one is banished; the host calls a revote
    const accusedId: string | null = gs?.accused_player_id ?? null;
    const reveal =
      phase === "reveal"
        ? {
            step: revealStep ?? "boards",
            myVote: name(me.vote_target_id),
            accusedId: revealStep === "banished" || revealStep === "role" ? accusedId : null,
            accusedName: revealStep === "banished" || revealStep === "role" ? name(accusedId) : null,
            // Only once the banished player reveals it themselves
            accusedRole:
              revealStep === "role" ? (players.find((p) => p.id === accusedId)?.role ?? "faithful") : null,
            tally:
              revealStep === "banished" || revealStep === "role" || revealStep === "tie"
                ? Object.values((gs?.vote_tally ?? {}) as Record<string, { name: string; votes: number; weightedVotes?: number }>)
                    .map((t) => ({ name: t.name, votes: t.weightedVotes ?? t.votes }))
                    .sort((a, b) => b.votes - a.votes)
                : [],
            votes:
              revealStep === "banished" || revealStep === "role" || revealStep === "tie"
                ? players
                    .filter((p) => p.vote_target_id)
                    .map((p) => ({
                      voterName: p.display_name,
                      targetName: `${name(p.vote_target_id) ?? "?"}${p.vote_doubled ? " (double vote)" : ""}`,
                    }))
                : [],
            iAmAccused: accusedId === playerId && (revealStep === "banished" || revealStep === "role"),
          }
        : null;

    // ── Murder ────────────────────────────────────────────────────────────────
    const murderStatus: string | null = gs?.murder_status ?? null;
    const murder = {
      status: murderStatus,
      // Announced to everyone only once the host reveals it
      victimName: murderStatus === "done" ? name(gs?.murder_victim_id) : null,
      ...(isTraitor
        ? {
            method: murderStatus === "open" || murderStatus === "chosen" ? (gs?.murder_method ?? null) : null,
            chosenName: murderStatus === "chosen" ? name(gs?.murder_victim_id) : null,
            byName: murderStatus === "chosen" && traitorsKnown ? name(gs?.murder_by_id) : null,
          }
        : {}),
    };

    // Breakfast after a murder: everyone checks in, then the victim is revealed
    const breakfast =
      murderStatus === "breakfast"
        ? {
            checkedIn: me.breakfast_round === gs?.murder_round,
            waitingOn: players.filter((p) => !p.eliminated && p.breakfast_round !== gs?.murder_round).length,
          }
        : null;

    // Endgame vote: end it, or banish again (unanimous to end)
    const endgameVote =
      phase === "reveal" && revealStep === "endgame"
        ? {
            mine: me.endgame_vote ?? null,
            voted: players.filter((p) => !p.eliminated && p.endgame_vote).length,
            voters: players.filter((p) => !p.eliminated).length,
            left: players.filter((p) => !p.eliminated).length,
          }
        : null;

    // Secret extras, shown only inside My secret. Powers can belong to anyone.
    const secretExtras: Record<string, unknown> = {
      // A Traitor who isn't told who the others are
      blind: isTraitor && !traitorsKnown,
      recruitOffer: !isTraitor && !!me.recruit_offer,
      daggers: me.daggers ?? 0,
      daggerArmed: !!me.dagger_armed,
      truthChecks: me.truth_checks ?? 0,
      recruit:
        isTraitor && gs?.recruit_status ? { status: gs.recruit_status, targetName: name(gs.recruit_target_id) } : null,
    };

    const endgame =
      phase === "end"
        ? {
            winner: gs?.winner ?? "faithful",
            players: players.map((p) => ({
              id: p.id,
              displayName: p.display_name,
              role: p.role || "faithful",
              shadowTokens: p.shadow_tokens,
              eliminated: p.eliminated ?? null,
            })),
          }
        : null;

    // Mark this player as back online. Only when it changes: every write to
    // the players table is pushed to every screen in the game.
    if (!me.is_connected) {
      await db
        .from("traitors_day_players")
        .update({ is_connected: true, last_seen_at: new Date().toISOString() })
        .eq("id", playerId);
    }

    return NextResponse.json({
      hasProfile,
      finished: session.status === "finished" || session.status === "cancelled" || phase === "end",
      phase,
      round: gs?.round_number ?? 1,
      gameLength: session.game_length === "weekend" ? "weekend" : "day",
      paused: !!session.missions_paused,
      players: players.map((p) => ({
        id: p.id,
        displayName: p.display_name,
        avatarColor: p.avatar_color,
        isConnected: p.id === playerId ? true : p.is_connected,
        shadowTokens: p.shadow_tokens,
        eliminated: p.eliminated ?? null,
        shield: !!p.shield,
      })),
      eliminated: me.eliminated ?? null,
      // Won an event and still has to pick: the shield or a clue for everyone
      pendingChoice: me.pending_choice ?? null,
      role,
      deceivers,
      event,
      timerSeconds,
      voteSubmitted: phase === "voting" && (me.vote_locked || !!me.vote_target_id),
      voteTarget: phase === "voting" ? me.vote_target_id ?? null : null,
      reveal,
      murder,
      endgame,
      breakfast,
      endgameVote,
      secretExtras,
      // The host runs the game from a panel on their own player screen
      isHost,
    });
  } catch (err) {
    console.error("Player state error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
