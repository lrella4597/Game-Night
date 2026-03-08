import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRandomEvent } from "@/lib/day-of-deception/events";
import { sendPushToSession } from "@/lib/push";

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

    const { sessionId, eventTemplate } = await req.json();

    // Verify host owns session + fetch custom event pack
    const { data: session } = await supabase
      .from("traitors_day_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session || session.host_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get current game state to exclude current event from random selection
    const { data: gameState } = await supabase
      .from("traitors_day_game_state")
      .select("current_event_index, current_event_template")
      .eq("session_id", sessionId)
      .single();

    // Pick event template - check custom pack first
    const customEventPack = session.event_pack as { name: string; instructions: string; durationMinutes: number; deceiverSecretMission?: string }[] | null;
    let event: { name: string; instructions: string; durationMinutes: number; deceiverSecretMission?: string | null };

    if (eventTemplate && customEventPack && customEventPack.length > 0) {
      // Look in custom pack first for the named template
      const customEvent = customEventPack.find((e) => e.name === eventTemplate);
      if (customEvent) {
        event = { ...customEvent, deceiverSecretMission: customEvent.deceiverSecretMission ?? null };
      } else {
        // Fall back to built-in templates
        const { EVENT_TEMPLATES } = await import("@/lib/day-of-deception/events");
        const builtIn = EVENT_TEMPLATES.find((e) => e.name === eventTemplate);
        if (!builtIn) {
          return NextResponse.json({ error: "Event template not found" }, { status: 404 });
        }
        event = builtIn;
      }
    } else if (eventTemplate) {
      // No custom pack, use built-in templates
      const { EVENT_TEMPLATES } = await import("@/lib/day-of-deception/events");
      const builtIn = EVENT_TEMPLATES.find((e) => e.name === eventTemplate);
      if (!builtIn) {
        return NextResponse.json({ error: "Event template not found" }, { status: 404 });
      }
      event = builtIn;
    } else if (customEventPack && customEventPack.length > 0) {
      // Random from custom pack, excluding current event
      const exclude = gameState?.current_event_template || "";
      const available = customEventPack.filter((e) => e.name !== exclude);
      const pick = available.length > 0
        ? available[Math.floor(Math.random() * available.length)]
        : customEventPack[Math.floor(Math.random() * customEventPack.length)];
      event = { ...pick, deceiverSecretMission: pick.deceiverSecretMission ?? null };
    } else {
      // Fall back to default random event
      const exclude = gameState?.current_event_template ? [gameState.current_event_template] : [];
      event = getRandomEvent(exclude);
    }

    const newEventIndex = (gameState?.current_event_index ?? 0) + 1;

    // Update game state
    await supabase
      .from("traitors_day_game_state")
      .update({
        phase: "event_active",
        current_event_template: event.name,
        event_started_at: new Date().toISOString(),
        event_duration_seconds: event.durationMinutes * 60,
        current_event_index: newEventIndex,
        last_action: "event_started",
      })
      .eq("session_id", sessionId);

    await sendPushToSession(supabase, sessionId, {
      title: `📣 New Event: ${event.name}`,
      body: "Check your phone — a group event has started!",
      tag: "event",
    });

    return NextResponse.json({
      eventName: event.name,
      instructions: event.instructions,
      durationMinutes: event.durationMinutes,
      deceiverSecretMission: event.deceiverSecretMission || null,
    });
  } catch (err) {
    console.error("Start event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
