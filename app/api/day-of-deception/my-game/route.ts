import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";

// The signed-in player's current game, if any. Lets a phone with no saved
// game (new phone, home screen app, cleared browser) drop straight back in
// after signing in.
export async function GET() {
  try {
    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ game: null });

    const { data: rows } = await db
      .from("traitors_day_players")
      .select("id, display_name, session_id, joined_at, traitors_day_sessions!inner(status)")
      .eq("user_id", user.id)
      .in("traitors_day_sessions.status", ["lobby", "active"])
      .order("joined_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) return NextResponse.json({ game: null });

    return NextResponse.json({
      game: {
        sessionId: row.session_id,
        playerId: row.id,
        playerName: row.display_name,
        playerToken: `${row.id}:${row.session_id}`,
      },
    });
  } catch (err) {
    console.error("My game error:", err);
    return NextResponse.json({ game: null });
  }
}
