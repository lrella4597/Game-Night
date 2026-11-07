import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { verifyPlayer } from "@/lib/day-of-deception/playerAuth";

// A player's "about you" answers, given in the lobby. Customize Today reads
// them so the host's AI-generated missions can use details about everyone.
const FIELDS = ["about", "quirk", "today"] as const;
const MAX_LEN = 300;

export async function POST(req: Request) {
  try {
    const { sessionId, playerId, token, profile } = await req.json();
    if (!sessionId || !playerId || !token || !profile || typeof profile !== "object") {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);
    const auth = await verifyPlayer(supabase, sessionId, playerId, token);
    if (!auth.ok) return auth.response;

    const clean: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = profile[f];
      if (typeof v === "string" && v.trim()) clean[f] = v.trim().slice(0, MAX_LEN);
    }

    const { error } = await db
      .from("traitors_day_players")
      .update({ profile: { ...clean, answeredAt: new Date().toISOString() } })
      .eq("id", playerId)
      .eq("session_id", sessionId);
    if (error) {
      console.error("Profile save error:", error);
      return NextResponse.json({ error: "Couldn't save your answers. Try again." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Profile error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
