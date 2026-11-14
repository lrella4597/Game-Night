import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { EVENT_TEMPLATES } from "@/lib/day-of-deception/events";

// What the host needs to run the game. Spoiler-free, because the host is
// usually playing too: no roles (except a banished player's, once they've
// revealed it themselves, and everyone's at the end), and no murder victim
// until it's announced.
export async function GET(req: Request) {
  try {
    const sessionId = new URL(req.url).searchParams.get("sessionId");
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: session }, { data: gs }, { data: rows }] = await Promise.all([
      db.from("traitors_day_sessions").select("*").eq("id", sessionId).single(),
      db.from("traitors_day_game_state").select("*").eq("session_id", sessionId).single(),
      db.from("traitors_day_players").select("*").eq("session_id", sessionId).order("joined_at", { ascending: true }),
    ]);
    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const players = rows || [];
    const name = (id: string | null | undefined) => players.find((p) => p.id === id)?.display_name ?? null;
    const phase: string = gs?.phase ?? "lobby";
    const step: string | null = phase === "reveal" ? (gs?.reveal_step ?? "boards") : null;
    const shown = step === "banished" || step === "role" || step === "tie";
    const living = players.filter((p) => !p.eliminated);
    const pack = (session.event_pack as { name: string }[] | null) ?? [];

    const endsAt = (startedAt: string | null, seconds: number | null) =>
      startedAt && seconds ? new Date(startedAt).getTime() + seconds * 1000 : null;

    return NextResponse.json({
      phase,
      round: gs?.round_number ?? 1,
      gameLength: session.game_length === "weekend" ? "weekend" : "day",
      paused: !!session.missions_paused,
      joinCode: session.join_code,
      // Where the host said they're playing, or a custom pack: ready to start
      settingChosen: !!(session.context_summary as { setting?: string } | null)?.setting || pack.length > 0,
      eventNames: pack.length > 0 ? pack.map((e) => e.name) : EVENT_TEMPLATES.map((e) => e.name),
      currentEvent: phase === "event_active" ? (gs?.current_event_template ?? null) : null,
      timerEndsAt:
        phase === "event_active"
          ? endsAt(gs?.event_started_at ?? null, gs?.event_duration_seconds ?? null)
          : phase === "roundtable" || phase === "voting"
            ? endsAt(gs?.timer_started_at ?? null, gs?.timer_duration_seconds ?? null)
            : null,
      players: players.map((p) => ({
        id: p.id,
        displayName: p.display_name,
        avatarColor: p.avatar_color,
        eliminated: p.eliminated ?? null,
        shield: !!p.shield,
      })),
      choosing: players.filter((p) => p.pending_choice).map((p) => p.display_name),
      votesIn: living.filter((p) => p.vote_locked).length,
      voters: living.length,
      reveal: step
        ? {
            step,
            accusedName: step === "banished" || step === "role" ? name(gs?.accused_player_id) : null,
            accusedRole:
              step === "role" ? (players.find((p) => p.id === gs?.accused_player_id)?.role ?? "faithful") : null,
            tally: shown
              ? Object.values((gs?.vote_tally ?? {}) as Record<string, { name: string; votes: number; weightedVotes?: number }>)
                  .map((t) => ({ name: t.name, votes: t.weightedVotes ?? t.votes }))
                  .sort((a, b) => b.votes - a.votes)
              : [],
          }
        : null,
      murder: {
        status: gs?.murder_status ?? null,
        victimName: gs?.murder_status === "done" ? name(gs?.murder_victim_id) : null,
        done: gs?.murders_done ?? 0,
      },
      breakfastWaiting:
        gs?.murder_status === "breakfast"
          ? living.filter((p) => p.breakfast_round !== gs?.murder_round).length
          : null,
      endgame:
        step === "endgame"
          ? { voted: living.filter((p) => p.endgame_vote).length, voters: living.length }
          : null,
      // Only that it's happening, never who
      recruiting: gs?.recruit_status === "open" || gs?.recruit_status === "offered",
      murderThisRound: gs?.murder_round === (gs?.round_number ?? 1),
      winner: phase === "end" ? (gs?.winner ?? null) : null,
      roles:
        phase === "end"
          ? players.map((p) => ({ displayName: p.display_name, role: p.role ?? "faithful", eliminated: p.eliminated ?? null }))
          : null,
    });
  } catch (err) {
    console.error("Host state error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
