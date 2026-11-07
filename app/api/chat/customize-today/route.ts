import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { mergePackParts } from "@/lib/chat/customizeTodayParts";
import { generatePackParts } from "@/lib/chat/generatePack";

// Each piece must finish well inside the hosting platform's request limit, so
// the host gets a clear error from us rather than a generic platform timeout.
// Pieces normally finish in ~18s. One that runs past this is dropped and the
// pack is returned without it, keeping the request well inside the hosting
// limit (requests of 28s+ were measured to complete on Netlify).
const PART_TIMEOUT_MS = 24000;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("customize-today: ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "The AI isn't set up on this site yet (missing API key)." },
        { status: 500 }
      );
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to customize the game." }, { status: 401 });
    }

    const body = await req.json();
    const { message, conversationHistory, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Add what players said about themselves when they joined (host's own game only)
    let fullMessage = message;
    if (typeof sessionId === "string" && sessionId) {
      fullMessage += await playersBlock(supabase, sessionId, user.id);
    }

    const started = Date.now();
    const outcomes = await generatePackParts(anthropic, fullMessage, conversationHistory, {
      timeoutMs: PART_TIMEOUT_MS,
    });

    const results: Record<string, unknown> = {};
    for (const o of outcomes) {
      if (o.ok) results[o.key] = o.data;
      else console.error(`customize-today part ${o.key} failed after ${o.ms}ms:`, o.error);
    }
    console.log(
      `customize-today: ${Object.keys(results).length}/${outcomes.length} parts in ${Date.now() - started}ms`
    );

    // Every piece failed: say why in plain words
    if (Object.keys(results).length === 0) {
      const err = outcomes.find((o) => !o.ok)?.error;
      let msg = "The AI couldn't build a pack right now. Please try again.";
      if (err instanceof Anthropic.AuthenticationError) msg = "The AI key on this site is invalid. Check ANTHROPIC_API_KEY.";
      else if (err instanceof Anthropic.RateLimitError) msg = "The AI is busy. Wait a moment and try again.";
      else if (err instanceof Anthropic.APIConnectionTimeoutError) msg = "The AI took too long. Please try again.";
      else if (err instanceof Anthropic.APIError && err.status === 400 && /credit/i.test(err.message))
        msg = "The Anthropic account is out of credits.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const pack = mergePackParts(results);
    return NextResponse.json({ success: true, response: pack });
  } catch (error) {
    console.error("Error in customize-today chat:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// "Players, in their own words" section for the AI, from the lobby answers.
async function playersBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  hostId: string
): Promise<string> {
  const { data: session } = await supabase
    .from("traitors_day_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.host_id !== hostId) return "";

  const { data: players, error } = await supabase
    .from("traitors_day_players")
    .select("display_name, profile")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  if (error || !players || players.length === 0) return "";

  const lines = players.map((p) => {
    const prof = (p.profile ?? {}) as Record<string, string>;
    const bits = [
      prof.about && `into/does: ${prof.about}`,
      prof.quirk && `friends roast them for: ${prof.quirk}`,
      prof.today && `today: ${prof.today}`,
    ].filter(Boolean);
    return `- ${p.display_name}${bits.length ? `: ${bits.join("; ")}` : " (no answers yet)"}`;
  });
  return `\n\nPlayers who joined the game, in their own words (use these details, and spread missions across different people):\n${lines.join("\n")}`;
}
