import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";

// The host deletes a game for everyone. Players, missions, clues and votes go
// with it (ON DELETE CASCADE).
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const db = dataClient(supabase);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await req.json();
    const { data: session } = await db.from("traitors_day_sessions").select("id, host_id").eq("id", sessionId).single();
    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Only the host can delete a game" }, { status: 403 });
    }

    const { error } = await db.from("traitors_day_sessions").delete().eq("id", sessionId);
    if (error) {
      // Fall back to hiding it, so it still leaves everyone's list
      await db.from("traitors_day_sessions").update({ status: "cancelled" }).eq("id", sessionId);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete game error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
