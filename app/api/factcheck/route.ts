import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

interface RequestBody {
  question: string;
  answer: string;
  category: string;
  value: number;
}

const SYSTEM_PROMPT = `You are a trivia fact-checker. Given a Jeopardy-style question and answer, verify whether the answer is correct.

Return ONLY a strict JSON object — no markdown, no code blocks, no extra text — in exactly this format:
{
  "verdict": "likely_correct" | "uncertain" | "likely_incorrect",
  "confidence": <integer 0-100>,
  "explanation": "<2-4 clear sentences explaining why the answer is correct or incorrect>",
  "supporting_facts": ["<fact 1>", "<fact 2>", "<fact 3>"],
  "common_confusions": ["<confusion 1>", "<confusion 2>"]
}

Rules:
- verdict "likely_correct" means you are confident the answer is correct.
- verdict "uncertain" means you lack enough information to be sure.
- verdict "likely_incorrect" means the answer appears to be wrong.
- supporting_facts: 2-4 brief factual bullets supporting your verdict.
- common_confusions: optional (omit or empty array if none). List alternate answers people might confuse with the correct one.
- Keep language clear and accessible — imagine explaining to a bright 12-year-old.
- If you truly cannot verify, set confidence below 50 and verdict "uncertain".`;

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 }
      );
    }

    // Verify API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY is not set in environment variables");
      throw new Error("API key not configured - restart dev server after adding .env.local");
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const body: RequestBody = await req.json();
    const { question, answer, category, value } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: "question and answer are required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Fact-checking: "${question.substring(0, 50)}..."`);

    const userMessage = `Category: ${category || "General"}
Point value: $${value ?? "?"}

Question: ${question}
Proposed answer: ${answer}

Fact-check this answer and return the JSON object described.`;

    let msg;
    try {
      msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        temperature: 0.2,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      console.log("✅ Fact check API responded");
    } catch (apiError: unknown) {
      console.error("❌ Fact check API call failed:", apiError);
      throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
    }

    const text = msg.content?.[0]?.type === "text" ? msg.content[0].text.trim() : "";

    if (!text) {
      throw new Error("No response from Claude API");
    }

    // Strip markdown code fences and any extra text before/after JSON
    let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    // Try to extract JSON object if wrapped in extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("❌ Fact check JSON parse failed. Raw text:", text);
      throw new Error("Failed to parse fact check response");
    }

    // Validate response structure
    if (!data.verdict || !data.explanation || typeof data.confidence !== 'number') {
      throw new Error("Invalid fact check response structure");
    }

    return NextResponse.json({
      ...data,
      _debug: {
        provider: "claude",
        model: "claude-sonnet-4-6",
      }
    });
  } catch (err: unknown) {
    console.error("Fact check error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
