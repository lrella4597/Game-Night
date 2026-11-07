import type { SupabaseClient } from "@supabase/supabase-js";
import { getRandomMission } from "@/lib/day-of-deception/missions";
import { sendPushToPlayer } from "@/lib/push";

export interface SentMission {
  missionId: string;
  playerId: string;
  missionText: string;
  missionCategory: string;
}

interface SessionRow {
  id: string;
  mission_pack?: { text: string; category: string }[] | null;
}

/**
 * Send one secret mission to a Deceiver: picks the Deceiver (the given one, or
 * whoever has had the fewest missions), picks an unused mission from the
 * game's custom pack (or the built-in list), saves it and notifies them.
 * Used by the host's "Send mission" button and the automatic mission timer.
 */
export async function sendMission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  session: SessionRow,
  requestedPlayerId?: string
): Promise<SentMission> {
  const sessionId = session.id;

  const { data: existingMissions } = await supabase
    .from("traitors_day_missions")
    .select("mission_text, player_id")
    .eq("session_id", sessionId);
  const existing = existingMissions || [];

  let targetPlayerId = requestedPlayerId;
  if (!targetPlayerId) {
    const { data: traitors } = await supabase
      .from("traitors_day_players")
      .select("id")
      .eq("session_id", sessionId)
      .eq("role", "traitor");
    if (!traitors || traitors.length === 0) throw new Error("No deceivers found");

    // Spread missions evenly: pick among the Deceivers with the fewest so far
    const counts = traitors.map((t) => ({
      id: t.id as string,
      n: existing.filter((m) => m.player_id === t.id).length,
    }));
    const fewest = Math.min(...counts.map((c) => c.n));
    const candidates = counts.filter((c) => c.n === fewest);
    targetPlayerId = candidates[Math.floor(Math.random() * candidates.length)].id;
  }

  const excludeTexts = existing.map((m) => m.mission_text);
  let mission: { text: string; category: string };
  const customPack = session.mission_pack;
  if (customPack && customPack.length > 0) {
    const unused = customPack.filter((m) => !excludeTexts.includes(m.text));
    const pool = unused.length > 0 ? unused : customPack;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    mission = { text: pick.text, category: pick.category };
  } else {
    mission = getRandomMission(excludeTexts);
  }

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
    throw new Error("Failed to create mission");
  }

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

  // Keep the mission itself off the lock screen, where others could see it
  await sendPushToPlayer(supabase, sessionId, targetPlayerId, {
    title: "🕵️ New secret mission",
    body: "Open the game to see it. Don't let anyone see your screen.",
    tag: "mission",
  });

  return {
    missionId: missionRow.id,
    playerId: targetPlayerId,
    missionText: mission.text,
    missionCategory: mission.category,
  };
}
