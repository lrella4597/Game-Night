import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";

export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, targetId } = await req.json();

    if (!sessionId || !playerId || !token || !targetId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const { data: rows } = await db.from("traitors_day_players").select("*").eq("session_id", sessionId);
    const player = rows?.find((p) => p.id === playerId);
    const target = rows?.find((p) => p.id === targetId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (player.eliminated) {
      return NextResponse.json({ error: "You're out of the game, so you can't vote" }, { status: 400 });
    }
    if (!target || target.eliminated || target.id === playerId) {
      return NextResponse.json({ error: "Pick someone still in the game" }, { status: 400 });
    }
    if (target.shield) {
      return NextResponse.json({ error: `${target.display_name} has the shield` }, { status: 400 });
    }

    // Record vote
    await db
      .from("traitors_day_players")
      .update({ vote_target_id: targetId, vote_locked: true })
      .eq("id", playerId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Submit vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
