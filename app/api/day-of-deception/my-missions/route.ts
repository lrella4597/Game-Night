import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const playerId = searchParams.get("playerId");
    const token = searchParams.get("token");

    if (!sessionId || !playerId || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    if (token !== `${playerId}:${sessionId}`) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: missions, error } = await supabase
      .from("traitors_day_missions")
      .select("id, mission_text, mission_category, is_completed, completed_proof, created_at, completed_at")
      .eq("session_id", sessionId)
      .eq("player_id", playerId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch missions error:", error);
      return NextResponse.json({ error: "Failed to fetch missions" }, { status: 500 });
    }

    const formatted = (missions || []).map((m) => ({
      id: m.id,
      missionText: m.mission_text,
      missionCategory: m.mission_category,
      isCompleted: m.is_completed,
      completedProof: m.completed_proof,
      createdAt: m.created_at,
      completedAt: m.completed_at,
    }));

    return NextResponse.json({ missions: formatted });
  } catch (err) {
    console.error("My missions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
