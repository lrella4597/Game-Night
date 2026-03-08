import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRandomMission } from "@/lib/day-of-deception/missions";
import { sendPushToPlayer } from "@/lib/push";

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

    const { sessionId, playerId: requestedPlayerId } = await req.json();

    // Verify host owns session + fetch custom mission pack
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Determine target player (specific or random traitor)
    let targetPlayerId = requestedPlayerId;

    if (!targetPlayerId) {
      const { data: traitors } = await supabase
        .from("traitors_day_players")
        .select("id")
        .eq("session_id", sessionId)
        .eq("role", "traitor");

      if (!traitors || traitors.length === 0) {
        return NextResponse.json({ error: "No deceivers found" }, { status: 400 });
      }

      targetPlayerId = traitors[Math.floor(Math.random() * traitors.length)].id;
    }

    // Fetch existing missions for this session to avoid duplicates
    const { data: existingMissions } = await supabase
      .from("traitors_day_missions")
      .select("mission_text")
      .eq("session_id", sessionId);

    const excludeTexts = (existingMissions || []).map((m) => m.mission_text);

    // Use custom mission pack if available, otherwise fall back to defaults
    let mission: { text: string; category: string };
    const customPack = session.mission_pack as { text: string; category: string }[] | null;

    if (customPack && customPack.length > 0) {
      const unused = customPack.filter((m) => !excludeTexts.includes(m.text));
      if (unused.length > 0) {
        const pick = unused[Math.floor(Math.random() * unused.length)];
        mission = { text: pick.text, category: pick.category };
      } else {
        // All custom missions used, recycle from custom pack
        const pick = customPack[Math.floor(Math.random() * customPack.length)];
        mission = { text: pick.text, category: pick.category };
      }
    } else {
      mission = getRandomMission(excludeTexts);
    }

    // Create mission row
    const { data: missionRow, error: missionError } = await supabase
      .from("traitors_day_missions")
      .insert({
        session_id: sessionId,
        player_id: targetPlayerId,
        mission_text: mission.text,
        mission_category: mission.category,
        is_completed: false,
      })
      .select("id")
      .single();

    if (missionError || !missionRow) {
      console.error("Mission insert error:", missionError);
      return NextResponse.json({ error: "Failed to create mission" }, { status: 500 });
    }

    // Increment missions_sent_count in game state
    const { data: gameState } = await supabase
      .from("traitors_day_game_state")
      .select("missions_sent_count")
      .eq("session_id", sessionId)
      .single();

    await supabase
      .from("traitors_day_game_state")
      .update({
        missions_sent_count: (gameState?.missions_sent_count ?? 0) + 1,
        last_action: "mission_sent",
      })
      .eq("session_id", sessionId);

    // Silently push-notify the traitor
    await sendPushToPlayer(supabase, sessionId, targetPlayerId, {
      title: "🕵️ New Secret Mission",
      body: mission.text,
      tag: "mission",
    });

    return NextResponse.json({
      missionId: missionRow.id,
      playerId: targetPlayerId,
      missionText: mission.text,
      missionCategory: mission.category,
    });
  } catch (err) {
    console.error("Send mission error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
