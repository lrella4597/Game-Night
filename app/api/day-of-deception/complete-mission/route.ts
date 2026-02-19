import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, missionId, proof } = await req.json();

    if (!sessionId || !playerId || !token || !missionId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (token !== `${playerId}:${sessionId}`) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const supabase = await createClient();

    // Verify mission belongs to this player
    const { data: mission, error: missionError } = await supabase
      .from("traitors_day_missions")
      .select("id, player_id, is_completed")
      .eq("id", missionId)
      .eq("session_id", sessionId)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }

    if (mission.player_id !== playerId) {
      return NextResponse.json({ error: "This mission does not belong to you" }, { status: 403 });
    }

    if (mission.is_completed) {
      return NextResponse.json({ error: "Mission already completed" }, { status: 400 });
    }

    // Mark mission as completed
    await supabase
      .from("traitors_day_missions")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        ...(proof ? { completed_proof: proof } : {}),
      })
      .eq("id", missionId);

    // Award +1 shadow token to the player
    const { data: player } = await supabase
      .from("traitors_day_players")
      .select("shadow_tokens")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .single();

    const newTokenCount = (player?.shadow_tokens ?? 0) + 1;

    await supabase
      .from("traitors_day_players")
      .update({ shadow_tokens: newTokenCount })
      .eq("id", playerId);

    return NextResponse.json({ success: true, newTokenCount });
  } catch (err) {
    console.error("Complete mission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
