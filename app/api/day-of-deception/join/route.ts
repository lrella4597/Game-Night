import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeJoinCode, isValidJoinCode } from "@/lib/live/joinCodeUtils";
import { PLAYER_COLORS } from "@/lib/live/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { joinCode: rawCode, displayName } = body;

    if (!rawCode || !displayName) {
      return NextResponse.json({ error: "joinCode and displayName are required" }, { status: 400 });
    }

    const joinCode = normalizeJoinCode(rawCode);
    if (!isValidJoinCode(joinCode)) {
      return NextResponse.json({ error: "Invalid join code format" }, { status: 400 });
    }

    const trimmedName = displayName.trim().slice(0, 20);
    if (trimmedName.length < 1) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: session, error: sessionError } = await supabase
      .from("traitors_day_sessions")
      .select("id, status, max_players")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Game not found. Check your code and try again." }, { status: 404 });
    }

    if (session.status !== "lobby") {
      return NextResponse.json({ error: "This game has already started or ended." }, { status: 400 });
    }

    const { count } = await supabase
      .from("traitors_day_players")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id);

    if (count !== null && count >= session.max_players) {
      return NextResponse.json({ error: "This game is full." }, { status: 400 });
    }

    const { data: existingPlayer } = await supabase
      .from("traitors_day_players")
      .select("id")
      .eq("session_id", session.id)
      .eq("display_name", trimmedName)
      .maybeSingle();

    if (existingPlayer) {
      return NextResponse.json({ error: "That name is already taken. Pick another!" }, { status: 409 });
    }

    const colorIndex = (count ?? 0) % PLAYER_COLORS.length;
    const avatarColor = PLAYER_COLORS[colorIndex];

    const { data: player, error: playerError } = await supabase
      .from("traitors_day_players")
      .insert({
        session_id: session.id,
        display_name: trimmedName,
        avatar_color: avatarColor,
        is_connected: true,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      console.error("Day player insert error:", playerError);
      return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
    }

    const playerToken = `${player.id}:${session.id}`;

    return NextResponse.json({
      sessionId: session.id,
      playerId: player.id,
      playerToken,
    });
  } catch (err) {
    console.error("Join day session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
