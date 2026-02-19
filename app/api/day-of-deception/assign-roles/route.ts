import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Verify host owns session
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("id, host_id, traitor_count")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all players
    const { data: players, error: playersError } = await supabase
      .from("traitors_day_players")
      .select("id")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true });

    if (playersError || !players || players.length < 1) {
      return NextResponse.json(
        { error: `Need at least 1 player (have ${players?.length ?? 0})` },
        { status: 400 }
      );
    }

    const deceiverCount = Math.min(session.traitor_count, Math.max(1, Math.floor(players.length / 3)) || 1);

    // Shuffle player IDs and pick deceivers
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const deceiverIds = new Set(shuffled.slice(0, deceiverCount).map((p) => p.id));

    // Assign roles
    for (const player of players) {
      const role = deceiverIds.has(player.id) ? "traitor" : "faithful";
      await supabase
        .from("traitors_day_players")
        .update({ role })
        .eq("id", player.id);
    }

    // Update game state
    await supabase
      .from("traitors_day_game_state")
      .update({
        phase: "roles_revealed",
        last_action: "roles_assigned",
      })
      .eq("session_id", sessionId);

    // Update session status
    await supabase
      .from("traitors_day_sessions")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", sessionId);

    return NextResponse.json({ success: true, deceiverCount });
  } catch (err) {
    console.error("Assign roles error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
