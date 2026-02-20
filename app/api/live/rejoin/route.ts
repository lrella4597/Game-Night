import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { playerId, sessionId } = await req.json();

    if (!playerId || !sessionId) {
      return NextResponse.json(
        { error: "playerId and sessionId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check session exists and is not finished
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "finished" || session.status === "cancelled") {
      return NextResponse.json(
        { error: "Session has ended" },
        { status: 410 }
      );
    }

    // Check player exists in this session
    const { data: player, error: playerError } = await supabase
      .from("live_players")
      .select("id, display_name, score")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (playerError || !player) {
      return NextResponse.json(
        { error: "Player not found in this session" },
        { status: 404 }
      );
    }

    // Mark player as reconnected
    await supabase
      .from("live_players")
      .update({
        is_connected: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    // Get current phase
    const { data: stateRow } = await supabase
      .from("live_game_state")
      .select("phase")
      .eq("session_id", sessionId)
      .single();

    return NextResponse.json({
      sessionId,
      playerId: player.id,
      playerName: player.display_name,
      currentPhase: stateRow?.phase || "lobby",
      playerToken: `${player.id}:${sessionId}`,
    });
  } catch (err) {
    console.error("Rejoin error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
