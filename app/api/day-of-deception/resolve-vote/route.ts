import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveVotes, determineWinner } from "@/lib/day-of-deception/winCondition";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await req.json();

    // Verify host owns session and fetch config
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("id, host_id, max_token_vote_bonus")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all players with their votes and shadow tokens
    const { data: players } = await supabase
      .from("traitors_day_players")
      .select("id, display_name, vote_target_id, shadow_tokens, role")
      .eq("session_id", sessionId);

    if (!players) {
      return NextResponse.json({ error: "No players" }, { status: 400 });
    }

    // Build vote entries and player name map
    const votes = players
      .filter((p) => p.vote_target_id)
      .map((p) => ({
        voterId: p.id,
        voterName: p.display_name,
        targetId: p.vote_target_id!,
        shadowTokens: p.shadow_tokens ?? 0,
      }));

    const playerNames: Record<string, string> = {};
    for (const p of players) {
      playerNames[p.id] = p.display_name;
    }

    const { tally, accusedId, tied } = resolveVotes(votes, playerNames, session.max_token_vote_bonus);

    // Build individual vote details (who voted for whom)
    const voteDetails = votes.map((v) => ({
      voterName: v.voterName,
      targetName: playerNames[v.targetId] || "Unknown",
    }));

    // Get accused player info
    let accusedName: string | null = null;
    let accusedRole: string | null = null;
    if (accusedId) {
      const accused = players.find((p) => p.id === accusedId);
      if (accused) {
        accusedName = accused.display_name;
        accusedRole = accused.role;
      }
    }

    const winner = determineWinner(accusedId, accusedRole);

    // Update game state
    await supabase
      .from("traitors_day_game_state")
      .update({
        vote_tally: tally,
        accused_player_id: accusedId,
        winner,
        phase: "reveal",
        roles_revealed: true,
        last_action: "vote_resolved",
      })
      .eq("session_id", sessionId);

    // Update session status to finished
    await supabase
      .from("traitors_day_sessions")
      .update({ status: "finished", finished_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({
      voteTally: tally,
      voteDetails,
      accusedId,
      accusedName,
      accusedRole,
      tied,
      winner,
    });
  } catch (err) {
    console.error("Resolve vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
