import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, targetId } = await req.json();

    if (!sessionId || !playerId || !token || !targetId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (token !== `${playerId}:${sessionId}`) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const supabase = await createClient();

    // Verify player exists in this session
    const { data: player } = await supabase
      .from("traitors_day_players")
      .select("id")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .single();

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Verify target exists in the same session
    const { data: target } = await supabase
      .from("traitors_day_players")
      .select("id")
      .eq("id", targetId)
      .eq("session_id", sessionId)
      .single();

    if (!target) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

    // Record vote
    await supabase
      .from("traitors_day_players")
      .update({ vote_target_id: targetId, vote_locked: true })
      .eq("id", playerId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Submit vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
