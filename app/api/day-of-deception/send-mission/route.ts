import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMission } from "@/lib/day-of-deception/missionSender";

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

    const { sessionId, playerId: requestedPlayerId } = await req.json();

    // Verify host owns session + fetch custom mission pack
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
      const sent = await sendMission(supabase, session, requestedPlayerId);
      return NextResponse.json(sent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send mission";
      return NextResponse.json({ error: message }, { status: message === "No deceivers found" ? 400 : 500 });
    }
  } catch (err) {
    console.error("Send mission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
