import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJoinCode } from "@/lib/live/joinCodeUtils";
import { DEFAULT_DAY_CONFIG } from "@/lib/day-of-deception/types";
import type { CreateDayRequest } from "@/lib/day-of-deception/types";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateDayRequest = await req.json();
    const config = { ...DEFAULT_DAY_CONFIG, ...body.config };

    // Generate unique join code
    let joinCode = generateJoinCode();
    let retries = 0;
    while (retries < 5) {
      const { data: existing } = await supabase
        .from("traitors_day_sessions")
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();

      if (!existing) break;
      joinCode = generateJoinCode();
      retries++;
    }

    if (retries >= 5) {
      return NextResponse.json({ error: "Failed to generate unique join code" }, { status: 500 });
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from("traitors_day_sessions")
      .insert({
        host_id: user.id,
        join_code: joinCode,
        status: "lobby",
        traitor_count: config.deceiverCount,
        mission_cadence: config.missionCadence,
        number_of_events: config.numberOfEvents,
        discussion_timer_minutes: config.discussionTimerMinutes,
        voting_timer_seconds: config.votingTimerSeconds,
        reveal_roles_at_end: config.revealRolesAtEnd,
        show_admin_role_panel: config.showAdminRolePanel,
        max_token_vote_bonus: config.maxTokenVoteBonus,
        max_players: config.maxPlayers,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("Day session creation error:", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Create initial game state
    const { error: stateError } = await supabase.from("traitors_day_game_state").insert({
      session_id: session.id,
      phase: "lobby",
      current_event_index: 0,
      missions_sent_count: 0,
      roles_revealed: false,
    });

    if (stateError) {
      console.error("Day game state creation error:", stateError);
      await supabase.from("traitors_day_sessions").delete().eq("id", session.id);
      return NextResponse.json({ error: "Failed to create game state" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id, joinCode });
  } catch (err) {
    console.error("Create day session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
