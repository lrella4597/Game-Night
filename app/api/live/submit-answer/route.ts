import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { playerId, sessionId, drawingDataUrl, textAnswer } = await req.json();

    if (!playerId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify player belongs to session
    const { data: player, error: playerErr } = await supabase
      .from("live_players")
      .select("id, session_id")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .single();

    if (playerErr || !player) {
      return NextResponse.json({ error: "Player not found in session" }, { status: 404 });
    }

    // Save drawing and text answer
    const { error: updateErr } = await supabase
      .from("live_players")
      .update({
        final_answer_drawing: drawingDataUrl || null,
        final_answer_text: textAnswer || null,
      })
      .eq("id", playerId);

    if (updateErr) {
      console.error("Failed to save answer:", updateErr);
      return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Submit answer error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
