import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const playerId = searchParams.get("playerId");
    const token = searchParams.get("token");

    if (!sessionId || !playerId || !token) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Validate token
    if (token !== `${playerId}:${sessionId}`) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    const supabase = await createClient();

    // Fetch this player's role
    const { data: player, error } = await supabase
      .from("traitors_day_players")
      .select("id, role, display_name")
      .eq("id", playerId)
      .eq("session_id", sessionId)
      .single();

    if (error || !player || !player.role) {
      return NextResponse.json({ error: "Role not assigned yet" }, { status: 404 });
    }

    const result: {
      role: string;
      deceivers?: { id: string; displayName: string }[];
    } = { role: player.role };

    // If deceiver, also return fellow deceiver IDs + names
    if (player.role === "traitor") {
      const { data: fellowDeceivers } = await supabase
        .from("traitors_day_players")
        .select("id, display_name")
        .eq("session_id", sessionId)
        .eq("role", "traitor");

      result.deceivers = (fellowDeceivers || []).map((t) => ({
        id: t.id,
        displayName: t.display_name,
      }));
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("My role error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
