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

    const { sessionId, missionPack, eventPack, contextSummary } =
      await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Verify host owns session
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("id, host_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await supabase
      .from("traitors_day_sessions")
      .update({
        mission_pack: missionPack,
        event_pack: eventPack,
        context_summary: contextSummary,
      })
      .eq("id", sessionId);

    if (error) {
      console.error("Save pack error:", error);
      return NextResponse.json(
        { error: "Failed to save pack" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in save-pack:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
