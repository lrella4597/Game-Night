import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Only players still in the game vote
    const { data: rows } = await db.from("traitors_day_players").select("*").eq("session_id", sessionId);
    const living = (rows || []).filter((p) => !p.eliminated);
    const total = living.length;
    const voted = living.filter((p) => p.vote_locked).length;

    return NextResponse.json({
      total,
      voted,
      remaining: total - voted,
      // Names the host voting screen reads
      votedCount: voted,
      totalVoters: total,
    });
  } catch (err) {
    console.error("Vote status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
