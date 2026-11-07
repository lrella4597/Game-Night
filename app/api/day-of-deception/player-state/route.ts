import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { resolveVotes } from "@/lib/day-of-deception/winCondition";
import { EVENT_TEMPLATES } from "@/lib/day-of-deception/events";

// Snapshot of the game for one player, so a phone that was closed or asleep
// can pick up exactly where the game is now instead of waiting in the lobby
// for the next live broadcast.
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

    const [{ data: session }, { data: gs }, { data: rows }] = await Promise.all([
      db
        .from("traitors_day_sessions")
        // "*" so a column missing from the live database (e.g. event_pack)
        // can't make the whole query fail
        .select("*")
        .eq("id", sessionId)
        .single(),
      db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
      db
        .from("traitors_day_players")
        .select("id, display_name, avatar_color, is_connected, shadow_tokens, role, vote_target_id, vote_locked")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true }),
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

    // Has this player answered the "about you" questions? Separate query so a
    // database without the profile column doesn't break the whole check.
    const { data: profileRow } = await db
      .from("traitors_day_players")
      .select("profile")
      .eq("id", playerId)
      .maybeSingle();
    const hasProfile = !!profileRow?.profile;

    const phase: string = gs?.phase ?? "lobby";
    const now = Date.now();
    const remaining = (startedAt: string | null, seconds: number | null) => {
      if (!startedAt || !seconds) return null;
      const left = Math.round((new Date(startedAt).getTime() + seconds * 1000 - now) / 1000);
      return left > 0 ? left : 0;
    };

    // Role (and fellow deceivers, only for deceivers)
    const isTraitor = me.role === "traitor";
    const role = me.role ?? null;
    const deceivers = isTraitor
      ? players
          .filter((p) => p.role === "traitor" && p.id !== playerId)
          .map((p) => ({ id: p.id, displayName: p.display_name }))
      : [];

    // Active event
    let event: {
      eventName: string;
      instructions: string;
      durationMinutes: number;
      deceiverSecretMission?: string;
    } | null = null;
    let timerSeconds: number | null = null;

    if (phase === "event_active" && gs?.current_event_template) {
      const pack = (session.event_pack as
        | { name: string; instructions: string; durationMinutes: number; deceiverSecretMission?: string | null }[]
        | null) ?? [];
      const tpl =
        pack.find((e) => e.name === gs.current_event_template) ??
        EVENT_TEMPLATES.find((e) => e.name === gs.current_event_template);
      if (tpl) {
        event = {
          eventName: tpl.name,
          instructions: tpl.instructions,
          durationMinutes: tpl.durationMinutes,
          // Secret objective only goes to deceivers
          ...(isTraitor && tpl.deceiverSecretMission
            ? { deceiverSecretMission: tpl.deceiverSecretMission }
            : {}),
        };
      }
      timerSeconds = remaining(gs.event_started_at, gs.event_duration_seconds);
    } else if (phase === "roundtable" || phase === "voting") {
      timerSeconds = remaining(gs?.timer_started_at ?? null, gs?.timer_duration_seconds ?? null);
    }

    // Vote result (after the vote is resolved)
    let voteResult = null;
    if ((phase === "reveal" || phase === "end") && gs?.vote_tally) {
      const names: Record<string, string> = {};
      for (const p of players) names[p.id] = p.display_name;
      const votes = players
        .filter((p) => p.vote_target_id)
        .map((p) => ({
          voterId: p.id,
          voterName: p.display_name,
          targetId: p.vote_target_id as string,
          shadowTokens: p.shadow_tokens ?? 0,
        }));
      const { tied } = resolveVotes(votes, names, session.max_token_vote_bonus ?? 3);
      const accused = players.find((p) => p.id === gs.accused_player_id);
      voteResult = {
        voteTally: gs.vote_tally,
        voteDetails: votes.map((v) => ({ voterName: v.voterName, targetName: names[v.targetId] || "Unknown" })),
        accusedId: gs.accused_player_id ?? null,
        accusedName: accused?.display_name ?? null,
        accusedRole: accused?.role ?? null,
        tied,
        winner: gs.winner ?? "traitors",
      };
    }

    const endgame =
      phase === "end"
        ? {
            winner: gs?.winner ?? "faithful",
            players: players.map((p) => ({
              id: p.id,
              displayName: p.display_name,
              role: p.role || "faithful",
              shadowTokens: p.shadow_tokens,
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
      players: players.map((p) => ({
        id: p.id,
        displayName: p.display_name,
        avatarColor: p.avatar_color,
        isConnected: p.id === playerId ? true : p.is_connected,
        shadowTokens: p.shadow_tokens,
      })),
      role,
      deceivers,
      event,
      timerSeconds,
      voteSubmitted: phase === "voting" && (me.vote_locked || !!me.vote_target_id),
      voteTarget: phase === "voting" ? me.vote_target_id ?? null : null,
      voteResult,
      endgame,
    });
  } catch (err) {
    console.error("Player state error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
