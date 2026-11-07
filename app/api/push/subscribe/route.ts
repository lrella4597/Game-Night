import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPush } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const { subscription, playerId, sessionId, gameType } = await req.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !playerId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    const record = {
      player_id: playerId,
      session_id: sessionId,
      game_type: gameType || "day-of-deception",
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    };

    // Is this phone already signed up for this player in this game?
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("endpoint")
      .eq("player_id", playerId)
      .eq("session_id", sessionId)
      .maybeSingle();
    const isNew = existing?.endpoint !== subscription.endpoint;

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({ ...record, updated_at: new Date().toISOString() }, { onConflict: "player_id,session_id" });

    if (error) {
      // Don't report success if nothing was saved, or the player thinks
      // alerts are on when they aren't
      console.error("Push subscribe save error:", error);
      return NextResponse.json({ error: "Could not save notification settings" }, { status: 500 });
    }

    // First time on (for this phone, player and game): send a test alert so the player knows it works
    if (isNew) {
      await sendPush(record, {
        title: "🔔 Notifications are on",
        body: "You'll get alerts for missions and events, even with your phone locked.",
        tag: "push-welcome",
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
