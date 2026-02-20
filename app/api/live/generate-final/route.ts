import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "AI service is not configured" },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Verify user is the host of this session
    const { data: session, error: sessionError } = await supabase
      .from("live_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("host_id", user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authorized for this session" }, { status: 403 });
    }

    console.log(`🎯 Generating Final Jeopardy clue for session ${sessionId}`);

    const systemPrompt = `You are generating a single Final Jeopardy clue. This is the climactic final question of a Jeopardy game.

REQUIREMENTS:
- Generate ONE high-difficulty clue (difficulty 8-10 out of 10)
- The category should be broad enough to be interesting but specific enough to guide thinking
- The clue should be challenging but fair — solvable with knowledge and reasoning
- The answer should be specific and unambiguous (a person, place, thing, or title)

OUTPUT FORMAT (STRICT JSON, no markdown, no extra text):

{
  "category": "The category name (e.g., 'World Leaders', 'American Literature', '20th Century Science')",
  "clue": "The full Jeopardy-style clue text",
  "answer": "The correct response"
}

QUALITY GUIDELINES:
- The clue should feel like an authentic Final Jeopardy question
- Avoid overly obscure trivia — the answer should be recognizable
- The clue should provide multiple angles or hints for deduction
- The category should add meaningful context without giving away the answer
- Make it memorable and discussion-worthy

Generate one exceptional Final Jeopardy clue now.`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: "Generate a Final Jeopardy clue." }],
    });

    const text = msg.content?.[0]?.type === "text" ? msg.content[0].text.trim() : "";
    if (!text) {
      throw new Error("Empty response from Claude");
    }

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.category || !parsed.clue || !parsed.answer) {
      throw new Error("Invalid response format — missing required fields");
    }

    // Store in session
    await supabase
      .from("live_sessions")
      .update({
        final_jeopardy: {
          category: parsed.category,
          clue: parsed.clue,
          answer: parsed.answer,
        },
      })
      .eq("id", sessionId);

    console.log(`✅ Final Jeopardy generated: "${parsed.category}"`);

    return NextResponse.json({
      category: parsed.category,
      clue: parsed.clue,
      answer: parsed.answer,
    });
  } catch (err: unknown) {
    console.error("Final Jeopardy generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate Final Jeopardy", details: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
