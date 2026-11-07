import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMission } from "@/lib/day-of-deception/missionSender";

// Automatic missions. Called every few minutes by the scheduled function in
// netlify/functions/dod-tick.mts. For each game that's underway with a mission
// cadence set (every 30 / 45 / 60 minutes), sends the next mission once it's
// due, so missions keep arriving all day without the host doing anything.
//
// Safe to call any time: it only ever sends a mission that is already due, so
// extra calls can't send extra missions. Running regularly also keeps the
// Supabase project from pausing for inactivity.

const ACTIVE_PHASES = ["freeplay", "event_active"];
const MAX_GAME_AGE_MS = 24 * 60 * 60 * 1000;
// A tick runs every 5 minutes; send when within a minute of due so a mission
// set for every 30 minutes doesn't slip to 35.
const GRACE_MS = 60 * 1000;

async function tick() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const now = Date.now();

  const { data: sessions, error } = await supabase
    .from("traitors_day_sessions")
    // "*" so a database missing the optional mission_pack column still works
    .select("*")
    .eq("status", "active")
    .in("mission_cadence", ["30", "45", "60"])
    .gte("started_at", new Date(now - MAX_GAME_AGE_MS).toISOString());
  if (error) throw error;

  const results: { sessionId: string; sent?: string; skipped?: string }[] = [];
  for (const session of sessions || []) {
    try {
      const { data: gs } = await supabase
        .from("traitors_day_game_state")
        .select("phase")
        .eq("session_id", session.id)
        .single();
      if (!gs || !ACTIVE_PHASES.includes(gs.phase)) {
        results.push({ sessionId: session.id, skipped: `phase ${gs?.phase ?? "unknown"}` });
        continue;
      }

      const { data: last } = await supabase
        .from("traitors_day_missions")
        .select("created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastAt = new Date(last?.created_at ?? session.started_at ?? now).getTime();
      const dueAt = lastAt + Number(session.mission_cadence) * 60 * 1000;
      if (now < dueAt - GRACE_MS) {
        results.push({ sessionId: session.id, skipped: `next in ${Math.round((dueAt - now) / 60000)} min` });
        continue;
      }

      const sent = await sendMission(supabase, session);
      results.push({ sessionId: session.id, sent: sent.missionId });
    } catch (err) {
      console.error(`dod tick: session ${session.id} failed:`, err);
      results.push({ sessionId: session.id, skipped: "error" });
    }
  }
  return results;
}

async function handler() {
  try {
    const results = await tick();
    console.log("dod tick:", JSON.stringify(results));
    return NextResponse.json({ ok: true, games: results.length, results });
  } catch (err) {
    console.error("dod tick failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
