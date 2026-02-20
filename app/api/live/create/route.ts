import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/live/joinCodeUtils";
import type { CreateSessionRequest, LiveSessionConfig } from "@/lib/live/types";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }

    const body: CreateSessionRequest = await req.json();
    const config: LiveSessionConfig = {
      enableDoubleJeopardy: body.config?.enableDoubleJeopardy ?? false,
      buzzerLockoutMs: body.config?.buzzerLockoutMs ?? 250,
      clueTimerSeconds: body.config?.clueTimerSeconds ?? 30,
      finalTimerSeconds: body.config?.finalTimerSeconds ?? 30,
      wagerTimerSeconds: body.config?.wagerTimerSeconds ?? 60,
      maxPlayers: body.config?.maxPlayers ?? 12,
    };

    // Generate unique join code (retry on collision)
    let joinCode = generateJoinCode();
    let retries = 0;
    while (retries < 5) {
      const { data: existing } = await supabase
        .from("live_sessions")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();

      if (!existing) break;
      joinCode = generateJoinCode();
      retries++;
    }

    if (retries >= 5) {
      return NextResponse.json(
        { error: "Failed to generate unique join code" },
        { status: 500 }
      );
    }

    // Create session
    const hostCompanionToken = randomUUID();
    const insertData: Record<string, unknown> = {
      host_id: user.id,
      join_code: joinCode,
      status: "lobby",
      host_companion_token: hostCompanionToken,
      enable_double_jeopardy: config.enableDoubleJeopardy,
      buzzer_lockout_ms: config.buzzerLockoutMs,
      clue_timer_seconds: config.clueTimerSeconds,
      final_timer_seconds: config.finalTimerSeconds,
      wager_timer_seconds: config.wagerTimerSeconds,
      max_players: config.maxPlayers,
    };

    // If boardData provided (e.g. from community "Play Now"), pre-load it
    if (body.boardData) {
      insertData.board_data = body.boardData;
    }

    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .insert(insertData)
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Session creation error:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Create initial game state
    const { error: stateError } = await supabase
      .from("live_game_state")
      .insert({
        session_id: session.id,
        phase: "lobby",
        current_round: 1,
        clues_revealed: [],
        daily_doubles: [],
        buzzer_queue: [],
        buzzer_locked: true,
        final_reveal_index: 0,
        final_reveal_order: [],
      });

    if (stateError) {
      console.error("Game state creation error:", stateError);
      // Clean up the session
      await supabase.from("live_sessions").delete().eq("id", session.id);
      return NextResponse.json(
        { error: "Failed to create game state" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionId: session.id,
      joinCode,
      hostCompanionToken,
    });
  } catch (err) {
    console.error("Create session error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
