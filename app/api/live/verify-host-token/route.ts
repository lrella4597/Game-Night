import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { sessionId, token } = await req.json();

    if (!sessionId || !token) {
      return NextResponse.json({ error: "sessionId and token are required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from("live_sessions")
      .select("id, status, host_id, join_code")
      .eq("id", sessionId)
      .eq("host_companion_token", token)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Invalid session or token" }, { status: 403 });
    }

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
    });
  } catch (err) {
    console.error("Verify host token error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
