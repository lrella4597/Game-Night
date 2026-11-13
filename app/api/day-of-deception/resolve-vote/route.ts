import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { resolveVotes } from "@/lib/day-of-deception/winCondition";

// Voting is over: count the votes, but don't show anything yet. The reveal
// starts with everyone holding up their own vote (step "boards"); the host
// then counts, the banished player is named, and they reveal their own role.
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();
    const { data: session } = await db.from("traitors_day_sessions").select("id, host_id").eq("id", sessionId).single();
    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: players } = await db.from("traitors_day_players").select("*").eq("session_id", sessionId);
    if (!players) return NextResponse.json({ error: "No players" }, { status: 400 });

    const living = players.filter((p) => !p.eliminated);
    const votes = living
      .filter((p) => p.vote_target_id)
      .map((p) => ({
        voterId: p.id,
        voterName: p.display_name,
        targetId: p.vote_target_id as string,
        // An armed double vote counts twice
        shadowTokens: p.dagger_armed && (p.daggers ?? 0) > 0 ? 1 : 0,
      }));
    const daggers = votes.filter((v) => v.shadowTokens > 0);
    const names: Record<string, string> = {};
    for (const p of players) names[p.id] = p.display_name;

    const { tally, accusedId, tied } = resolveVotes(votes, names, 1);
    if (daggers.length > 0) {
      const { logEvent } = await import("@/lib/day-of-deception/rounds");
      for (const d of daggers) {
        const p = players.find((x) => x.id === d.voterId);
        await db
          .from("traitors_day_players")
          .update({ daggers: Math.max(0, (p?.daggers ?? 1) - 1), dagger_armed: false, vote_doubled: true })
          .eq("id", d.voterId);
        await logEvent(db, sessionId, `${d.voterName} used a double vote on ${names[d.targetId]}.`);
      }
    }

    await db
      .from("traitors_day_game_state")
      .update({
        vote_tally: tally,
        accused_player_id: tied ? null : accusedId,
        phase: "reveal",
        reveal_step: "boards",
        timer_started_at: null,
        last_action: tied ? "vote_tied" : "vote_counted",
      })
      .eq("session_id", sessionId);

    return NextResponse.json({ success: true, tied });
  } catch (err) {
    console.error("Resolve vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
