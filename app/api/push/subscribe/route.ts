import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { subscription, playerId, sessionId, gameType } = await req.json();

    if (!subscription?.endpoint || !playerId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    await supabase.from("push_subscriptions").upsert(
      {
        player_id: playerId,
        session_id: sessionId,
        game_type: gameType || "day-of-deception",
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "player_id,session_id" }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
