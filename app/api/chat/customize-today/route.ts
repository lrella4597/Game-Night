import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { PACK_PART_MODEL } from "@/lib/ai/models";
import {
  PACK_PARTS,
  PART_SYSTEM_PROMPT,
  getPartUserMessage,
  mergePackParts,
} from "@/lib/chat/customizeTodayParts";

// Each piece must finish well inside the hosting platform's request limit, so
// the host gets a clear error from us rather than a generic platform timeout.
// Pieces normally finish in ~6s. One that runs past this is dropped and the
// pack is returned without it, rather than the whole request hitting the
// platform's ~10s limit and failing.
const PART_TIMEOUT_MS = 7500;

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
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const started = Date.now();
    const settled = await Promise.allSettled(
      PACK_PARTS.map(async (part) => {
        const response = await anthropic.messages.create(
          {
            model: PACK_PART_MODEL,
            max_tokens: part.maxTokens,
            // No thinking and low effort keep each piece fast enough
            thinking: { type: "between_tools" } as unknown as Anthropic.ThinkingConfigParam,
            system: PART_SYSTEM_PROMPT,
            output_config: {
              effort: "low",
              format: { type: "json_schema", schema: part.schema as Record<string, unknown> },
            },
            messages: [
              { role: "user", content: getPartUserMessage(part, message, conversationHistory) },
            ],
          },
          { timeout: PART_TIMEOUT_MS, maxRetries: 0 }
        );
        const text = response.content.find((b) => b.type === "text");
        if (!text || text.type !== "text") throw new Error(`No text in ${part.key}`);
        return [part.key, JSON.parse(text.text)] as const;
      })
    );

    const results: Record<string, unknown> = {};
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") results[s.value[0]] = s.value[1];
      else console.error(`customize-today part ${PACK_PARTS[i].key} failed:`, s.reason);
    });
    console.log(
      `customize-today: ${Object.keys(results).length}/${PACK_PARTS.length} parts in ${Date.now() - started}ms`
    );

    // Every piece failed: say why in plain words
    if (Object.keys(results).length === 0) {
      const first = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
      const err = first?.reason;
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
