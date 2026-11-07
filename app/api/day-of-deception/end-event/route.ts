import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { awardEventClues } from "@/lib/day-of-deception/clues";

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

    const { sessionId, winnerIds } = await req.json();

    // Verify host owns session
    const { data: session } = await db
      .from("traitors_day_sessions")
      .select("id, host_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Clues: each winner gets one, plus one anonymous tip to someone else
    const { data: gs } = await db
      .from("traitors_day_game_state")
      .select("current_event_template")
      .eq("session_id", sessionId)
      .single();
    let cluesAwarded = 0;
    try {
      const ids = Array.isArray(winnerIds) ? winnerIds.filter((x: unknown) => typeof x === "string") : [];
      ({ awarded: cluesAwarded } = await awardEventClues(db, sessionId, gs?.current_event_template ?? null, ids));
    } catch (err) {
      // Don't strand the game mid-event if clues fail; the host sees the count
      console.error("Award clues error:", err);
    }

    // Update game state
    await db
      .from("traitors_day_game_state")
      .update({
        phase: "freeplay",
        event_started_at: null,
        last_action: "event_ended",
      })
      .eq("session_id", sessionId);

    return NextResponse.json({ success: true, cluesAwarded });
  } catch (err) {
    console.error("End event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
