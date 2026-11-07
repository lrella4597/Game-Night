import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { fakeTipsAvailable } from "@/lib/day-of-deception/clues";

// A player's clues. Fake tips look exactly like real anonymous tips: the
// is_fake flag never leaves the server.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const playerId = searchParams.get("playerId");
    const token = searchParams.get("token");
    if (!sessionId || !playerId || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const [{ data: clues, error }, { data: me }] = await Promise.all([
      db
        .from("traitors_day_clues")
        .select("id, kind, text, source, source_label, created_at")
        .eq("session_id", sessionId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false }),
      db.from("traitors_day_players").select("role").eq("id", playerId).single(),
    ]);
    if (error) {
      console.error("My clues error:", error);
      return NextResponse.json({ error: "Couldn't load your clues" }, { status: 500 });
    }

    const fakeTips = me?.role === "traitor" ? await fakeTipsAvailable(db, sessionId, playerId) : 0;

    return NextResponse.json({
      clues: (clues || []).map((c) => ({
        id: c.id,
        kind: c.kind,
        text: c.text,
        source: c.source,
        sourceLabel: c.source_label,
        createdAt: c.created_at,
      })),
      fakeTips,
    });
  } catch (err) {
    console.error("My clues error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
