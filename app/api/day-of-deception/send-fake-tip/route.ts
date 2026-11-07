import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";
import { buildFakeClue, fakeTipsAvailable, sendFakeClue } from "@/lib/day-of-deception/clues";

// A Deceiver spends a completed mission on a fake anonymous tip:
//   clear: "<target> is Loyal."
//   frame: "One of <target>, <two Loyal players> is a Deceiver."
export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, recipientId, mode, targetId } = await req.json();
    if (!sessionId || !playerId || !token || !recipientId || !targetId || !["clear", "frame"].includes(mode)) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const [{ data: players }, { data: gs }] = await Promise.all([
      db.from("traitors_day_players").select("id, display_name, role").eq("session_id", sessionId),
      db.from("traitors_day_game_state").select("phase").eq("session_id", sessionId).single(),
    ]);
    const me = players?.find((p) => p.id === playerId);
    if (!me || me.role !== "traitor") {
      return NextResponse.json({ error: "Only Deceivers can send fake tips" }, { status: 403 });
    }
    if (!gs || !["freeplay", "event_active", "roundtable"].includes(gs.phase)) {
      return NextResponse.json({ error: "Fake tips are closed right now" }, { status: 400 });
    }
    if (recipientId === playerId || !players?.some((p) => p.id === recipientId)) {
      return NextResponse.json({ error: "Pick another player to send it to" }, { status: 400 });
    }
    if ((await fakeTipsAvailable(db, sessionId, playerId)) < 1) {
      return NextResponse.json({ error: "Complete a mission to earn a fake tip" }, { status: 400 });
    }

    const clue = buildFakeClue(players, playerId, mode, targetId);
    if (!clue) return NextResponse.json({ error: "Player not found" }, { status: 400 });

    await sendFakeClue(db, sessionId, playerId, recipientId, clue);
    return NextResponse.json({ success: true, text: clue.text });
  } catch (err) {
    console.error("Send fake tip error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
