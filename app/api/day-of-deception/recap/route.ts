import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";

// Everything that happened, once the game is over: every mission and who did
// it, shields, double votes, murders, recruitment.
// Open to the host, or a player with their token.
export async function GET(req: Request) {
  try {
    const sp = new URL(req.url).searchParams;
    const sessionId = sp.get("sessionId");
    const playerId = sp.get("playerId");
    const token = sp.get("token");
    if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

    const supabase = await createClient();
    const db = dataClient(supabase);
    const [{ data: session }, { data: gs }, { data: authData }] = await Promise.all([
      db.from("traitors_day_sessions").select("id, host_id").eq("id", sessionId).single(),
      db.from("traitors_day_game_state").select("phase").eq("session_id", sessionId).single(),
      supabase.auth.getUser(),
    ]);
    if (!session) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    const isHost = authData?.user?.id === session.host_id;
    if (!isHost) {
      if (!playerId || !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const auth = await verifyPlayer(supabase, sessionId, playerId, token);
      if (!auth.ok) return auth.response;
    }
    if (gs?.phase !== "end") return NextResponse.json({ error: "The game isn't over yet" }, { status: 400 });

    const [{ data: players }, { data: missions }, { data: log }] = await Promise.all([
      db.from("traitors_day_players").select("id, display_name").eq("session_id", sessionId),
      db
        .from("traitors_day_missions")
        .select("player_id, mission_text, is_completed, expired, created_at, completed_at")
        .eq("session_id", sessionId),
      db.from("traitors_day_log").select("text, created_at").eq("session_id", sessionId),
    ]);
    const name = (id: string | null) => players?.find((p) => p.id === id)?.display_name ?? "Someone";

    const items: { at: string; text: string }[] = [];
    for (const m of missions || []) {
      if (m.is_completed) {
        items.push({ at: m.completed_at ?? m.created_at, text: `${name(m.player_id)} pulled off: "${m.mission_text}"` });
      } else if (m.expired) {
        items.push({ at: m.created_at, text: `${name(m.player_id)} missed: "${m.mission_text}"` });
      }
    }
    for (const l of log || []) items.push({ at: l.created_at, text: l.text });

    // Times inside the text are formatted on the phone, in its own time zone
    items.sort((a, b) => a.at.localeCompare(b.at));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Recap error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
