import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToSession } from "@/lib/push";

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
      .select("id, host_id, discussion_timer_minutes")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const timerDurationSeconds = session.discussion_timer_minutes * 60;

    // Update game state
    await supabase
      .from("traitors_day_game_state")
      .update({
        phase: "roundtable",
        timer_started_at: new Date().toISOString(),
        timer_duration_seconds: timerDurationSeconds,
        last_action: "roundtable_started",
      })
      .eq("session_id", sessionId);

    await sendPushToSession(supabase, sessionId, {
      title: "🗣️ Roundtable Has Started",
      body: "Come together — it's time to discuss who you suspect!",
      tag: "roundtable",
    });

    return NextResponse.json({ success: true, timerDuration: timerDurationSeconds });
  } catch (err) {
    console.error("Start roundtable error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
