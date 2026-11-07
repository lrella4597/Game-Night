import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dataClient } from "@/lib/supabase/admin";
import { normalizeJoinCode, isValidJoinCode } from "@/lib/live/joinCodeUtils";
import { PLAYER_COLORS } from "@/lib/live/types";

// Players must be signed in to join. The player row is linked to their
// account, so the same account always gets back the same player (any phone,
// browser, or the home screen app) and nobody else can play as them.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { joinCode: rawCode, displayName } = body;

    if (!rawCode) {
      return NextResponse.json({ error: "Enter the game code" }, { status: 400 });
    }

    const joinCode = normalizeJoinCode(rawCode);
    if (!isValidJoinCode(joinCode)) {
      return NextResponse.json({ error: "Invalid join code format" }, { status: 400 });
    }

    const supabase = await createClient();
    const db = dataClient(supabase);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to join the game" }, { status: 401 });
    }

    const { data: session, error: sessionError } = await db
      .from("traitors_day_sessions")
      .select("id, status, max_players")
      .eq("join_code", joinCode)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Game not found. Check your code and try again." }, { status: 404 });
    }

    // Already in this game with this account: hand the player back
    const { data: mine } = await db
      .from("traitors_day_players")
      .select("id, display_name")
      .eq("session_id", session.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (mine) {
      if (session.status === "finished" || session.status === "cancelled") {
        return NextResponse.json({ error: "This game has ended." }, { status: 400 });
      }
      await db
        .from("traitors_day_players")
        .update({ is_connected: true, last_seen_at: new Date().toISOString() })
        .eq("id", mine.id);
      return NextResponse.json({
        sessionId: session.id,
        playerId: mine.id,
        playerName: mine.display_name,
        playerToken: `${mine.id}:${session.id}`,
        joinCode,
        rejoined: true,
      });
    }

    if (session.status !== "lobby") {
      return NextResponse.json(
        {
          error:
            "This game has already started. If you joined earlier, sign in with the same account you used.",
        },
        { status: 400 }
      );
    }

    const fallbackName =
      (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
      (user.user_metadata?.display_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "";
    const trimmedName = String(displayName || fallbackName).trim().slice(0, 20);
    if (trimmedName.length < 1) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    const { count } = await db
      .from("traitors_day_players")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id);

    if (count !== null && count >= session.max_players) {
      return NextResponse.json({ error: "This game is full." }, { status: 400 });
    }

    const { data: nameTaken } = await db
      .from("traitors_day_players")
      .select("id")
      .eq("session_id", session.id)
      .ilike("display_name", trimmedName.replace(/[%_\\]/g, "\\$&"))
      .maybeSingle();

    if (nameTaken) {
      return NextResponse.json({ error: "That name is already taken. Pick another!" }, { status: 409 });
    }

    const colorIndex = (count ?? 0) % PLAYER_COLORS.length;
    const avatarColor = PLAYER_COLORS[colorIndex];

    const { data: player, error: playerError } = await db
      .from("traitors_day_players")
      .insert({
        session_id: session.id,
        display_name: trimmedName,
        avatar_color: avatarColor,
        is_connected: true,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (playerError || !player) {
      console.error("Day player insert error:", playerError);
      return NextResponse.json({ error: "Failed to join game" }, { status: 500 });
    }

    return NextResponse.json({
      sessionId: session.id,
      playerId: player.id,
      playerName: trimmedName,
      playerToken: `${player.id}:${session.id}`,
      joinCode,
    });
  } catch (err) {
    console.error("Join day session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
