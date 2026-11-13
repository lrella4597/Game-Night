import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { MISSION_WINDOW_MS, releasePublicClue } from "@/lib/day-of-deception/clues";

export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, missionId, proof } = await req.json();

    if (!sessionId || !playerId || !token || !missionId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    // Verify mission belongs to this player
    const { data: mission, error: missionError } = await db
      .from("traitors_day_missions")
      .select("*")
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

    const { data: session } = await db.from("traitors_day_sessions").select("*").eq("id", sessionId).single();
    // Out of time, even if the timer job hasn't caught it yet (never while paused overnight)
    if (!session?.missions_paused && !mission.expired && Date.now() - new Date(mission.created_at).getTime() > MISSION_WINDOW_MS) {
      await releasePublicClue(db, sessionId, missionId).catch((err) =>
        console.error("Release public clue error:", err)
      );
      mission.expired = true;
    }

    if (mission.expired) {
      return NextResponse.json(
        { error: "Too late. This mission expired and everyone got a clue." },
        { status: 400 }
      );
    }

    // Mark mission as completed
    await db
      .from("traitors_day_missions")
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        ...(proof ? { completed_proof: proof } : {}),
      })
      .eq("id", missionId)
      .eq("player_id", playerId)
      .eq("session_id", sessionId);

    // Count completed missions. Every third one earns a double vote.
    const { data: player } = await db
      .from("traitors_day_players")
      .select("*")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .single();

    const newTokenCount = (player?.shadow_tokens ?? 0) + 1;
    const earnedDagger = newTokenCount % 3 === 0;

    await db
      .from("traitors_day_players")
      .update({
        shadow_tokens: newTokenCount,
        ...(earnedDagger ? { daggers: (player?.daggers ?? 0) + 1 } : {}),
      })
      .eq("id", playerId)
      .eq("session_id", sessionId);

    if (earnedDagger) {
      const { logEvent } = await import("@/lib/day-of-deception/rounds");
      await logEvent(db, sessionId, `${player?.display_name ?? "A Traitor"} earned a double vote for finishing 3 missions.`);
    }
    return NextResponse.json({ success: true, newTokenCount, earnedDagger });
  } catch (err) {
    console.error("Complete mission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
