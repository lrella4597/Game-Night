import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";

// Recent Traitors games for the signed-in account, one row per game, saying
// whether they host it, play in it, or both. Finished games stay listed for a
// few days so the host can clear them out.
const RECENT_DAYS = 7;

export async function GET() {
  try {
    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ games: [] });

    const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: playerRows }, { data: hostRows }] = await Promise.all([
      db
        .from("traitors_day_players")
        .select("id, display_name, session_id, traitors_day_sessions!inner(status, join_code, created_at)")
        .eq("user_id", user.id)
        .neq("traitors_day_sessions.status", "cancelled")
        .gte("traitors_day_sessions.created_at", since)
        .limit(30),
      db
        .from("traitors_day_sessions")
        .select("id, join_code, status, created_at")
        .eq("host_id", user.id)
        .neq("status", "cancelled")
        .gte("created_at", since)
        .limit(30),
    ]);

    type Game = {
      sessionId: string;
      joinCode: string;
      status: string;
      createdAt: string;
      isHost: boolean;
      player: { playerId: string; playerName: string; playerToken: string } | null;
    };
    const games = new Map<string, Game>();

    for (const s of hostRows || []) {
      games.set(s.id, {
        sessionId: s.id,
        joinCode: s.join_code,
        status: s.status,
        createdAt: s.created_at,
        isHost: true,
        player: null,
      });
    }

    type SessionInfo = { status: string; join_code: string; created_at: string };
    for (const r of playerRows || []) {
      const s = (Array.isArray(r.traitors_day_sessions) ? r.traitors_day_sessions[0] : r.traitors_day_sessions) as SessionInfo;
      const player = { playerId: r.id, playerName: r.display_name, playerToken: `${r.id}:${r.session_id}` };
      const existing = games.get(r.session_id);
      if (existing) existing.player = player;
      else
        games.set(r.session_id, {
          sessionId: r.session_id,
          joinCode: s?.join_code ?? "",
          status: s?.status ?? "lobby",
          createdAt: s?.created_at ?? "",
          isHost: false,
          player,
        });
    }

    const list = [...games.values()].sort((a, b) => {
      // Unfinished games first, then newest
      const done = (g: Game) => (g.status === "finished" ? 1 : 0);
      return done(a) - done(b) || b.createdAt.localeCompare(a.createdAt);
    });

    return NextResponse.json({ games: list });
  } catch (err) {
    console.error("My games error:", err);
    return NextResponse.json({ games: [] });
  }
}
