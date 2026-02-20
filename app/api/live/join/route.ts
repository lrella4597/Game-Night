import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeJoinCode, isValidJoinCode } from "@/lib/live/joinCodeUtils";
import { PLAYER_COLORS } from "@/lib/live/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { joinCode: rawCode, displayName } = body;

    if (!rawCode || !displayName) {
      return NextResponse.json(
        { error: "joinCode and displayName are required" },
        { status: 400 }
      );
    }

    const joinCode = normalizeJoinCode(rawCode);
    if (!isValidJoinCode(joinCode)) {
      return NextResponse.json(
        { error: "Invalid join code format" },
        { status: 400 }
      );
    }

    const trimmedName = displayName.trim().slice(0, 20);
    if (trimmedName.length < 1) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find session by join code
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id, status, max_players")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Game not found. Check your code and try again." },
        { status: 404 }
      );
    }

    // If game already started, allow reconnection by same name
    if (session.status !== "lobby") {
      if (session.status === "finished" || session.status === "cancelled") {
        return NextResponse.json(
          { error: "This game has already ended." },
          { status: 400 }
        );
      }

      // Check if a player with the same name already exists (reconnect)
      const { data: existingPlayer } = await supabase
        .from("live_players")
        .select("id")
        .eq("session_id", session.id)
        .eq("display_name", trimmedName)
        .maybeSingle();

      if (existingPlayer) {
        // Reconnect: mark as connected and return existing player data
        await supabase
          .from("live_players")
          .update({ is_connected: true, last_seen_at: new Date().toISOString() })
          .eq("id", existingPlayer.id);

        const playerToken = `${existingPlayer.id}:${session.id}`;
        return NextResponse.json({
          sessionId: session.id,
          playerId: existingPlayer.id,
          playerToken,
        });
      }

      return NextResponse.json(
        { error: "Game already started. Use the same name to rejoin." },
        { status: 400 }
      );
    }

    // Check player count
    const { count } = await supabase
      .from("live_players")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id);

    if (count !== null && count >= session.max_players) {
      return NextResponse.json(
        { error: "This game is full." },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const { data: existingPlayer } = await supabase
      .from("live_players")
      .select("id")
      .eq("session_id", session.id)
      .eq("display_name", trimmedName)
      .maybeSingle();

    if (existingPlayer) {
      return NextResponse.json(
        { error: "That name is already taken. Pick another!" },
        { status: 409 }
      );
    }

    // Assign avatar color based on player count
    const colorIndex = (count ?? 0) % PLAYER_COLORS.length;
    const avatarColor = PLAYER_COLORS[colorIndex];

    // Insert player
    const { data: player, error: playerError } = await supabase
      .from("live_players")
      .insert({
        session_id: session.id,
        display_name: trimmedName,
        avatar_color: avatarColor,
        score: 0,
        is_connected: true,
        correct_count: 0,
        incorrect_count: 0,
        buzz_count: 0,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      console.error("Player insert error:", playerError);
      return NextResponse.json(
        { error: "Failed to join game" },
        { status: 500 }
      );
    }

    // Generate a simple token (player ID + session ID hash for verification)
    const playerToken = `${player.id}:${session.id}`;

    return NextResponse.json({
      sessionId: session.id,
      playerId: player.id,
      playerToken,
    });
  } catch (err) {
    console.error("Join session error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
