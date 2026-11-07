import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Every unfinished Day of Deception game the signed-in account is in, as a
// player or as the host, so they can jump back into any of them.
const RECENT_DAYS = 3;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ playing: [], hosting: [] });

    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: playerRows }, { data: hostRows }] = await Promise.all([
      supabase
        .from("traitors_day_players")
        .select("id, display_name, session_id, joined_at, traitors_day_sessions!inner(status, join_code, created_at)")
        .eq("user_id", user.id)
        .in("traitors_day_sessions.status", ["lobby", "active"])
        .gte("traitors_day_sessions.created_at", since)
        .order("joined_at", { ascending: false })
        .limit(10),
      supabase
        .from("traitors_day_sessions")
        .select("id, join_code, status, created_at")
        .eq("host_id", user.id)
        .in("status", ["lobby", "active"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    type SessionInfo = { status: string; join_code: string };
    const playing = (playerRows || []).map((r) => {
      const s = (Array.isArray(r.traitors_day_sessions)
        ? r.traitors_day_sessions[0]
        : r.traitors_day_sessions) as SessionInfo;
      return {
        sessionId: r.session_id,
        joinCode: s?.join_code ?? "",
        status: s?.status ?? "lobby",
        playerId: r.id,
        playerName: r.display_name,
        playerToken: `${r.id}:${r.session_id}`,
      };
    });

    const hosting = (hostRows || []).map((s) => ({
      sessionId: s.id,
      joinCode: s.join_code,
      status: s.status,
    }));

    return NextResponse.json({ playing, hosting });
  } catch (err) {
    console.error("My games error:", err);
    return NextResponse.json({ playing: [], hosting: [] });
  }
}
