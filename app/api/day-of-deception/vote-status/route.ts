import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Count total players
    const { count: total } = await supabase
      .from("traitors_day_players")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);

    // Count players who have voted
    const { count: voted } = await supabase
      .from("traitors_day_players")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("vote_locked", true);

    const totalCount = total ?? 0;
    const votedCount = voted ?? 0;

    return NextResponse.json({
      total: totalCount,
      voted: votedCount,
      remaining: totalCount - votedCount,
    });
  } catch (err) {
    console.error("Vote status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
