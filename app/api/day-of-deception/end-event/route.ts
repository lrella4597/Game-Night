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
      .select("id, host_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update game state
    await supabase
      .from("traitors_day_game_state")
      .update({
        phase: "freeplay",
        event_started_at: null,
        last_action: "event_ended",
      })
      .eq("session_id", sessionId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("End event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
