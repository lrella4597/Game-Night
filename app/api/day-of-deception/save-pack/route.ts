import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";

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

    // keepPack: only the context changes (the host picked where they're
    // playing after Customize Today already wrote a pack)
    const { sessionId, missionPack, eventPack, contextSummary, keepPack } =
      await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Verify host owns session
    const { data: session } = await db
      .from("traitors_day_sessions")
      .select("id, host_id")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error } = await db
      .from("traitors_day_sessions")
      .update(
        keepPack
          ? { context_summary: contextSummary }
          : { mission_pack: missionPack ?? null, event_pack: eventPack ?? null, context_summary: contextSummary }
      )
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
