import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildClueGenerationPrompt, pointValueToDifficulty } from "@/lib/prompts/clueGenerationPrompt";
import type { GenerationState } from "@/lib/data/useGenerationState";
import { isDuplicateAnswer, REFRESH_TEMPERATURE } from "@/lib/generation/questionRefresh";

export async function POST(req: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

    const body = await req.json();
    const {
      categoryName,
      categoryPrompt,
      pointValue,
      generationState,
      currentClue,
      currentAnswer,
    } = body;

    if (!categoryName || !categoryPrompt) {
      return NextResponse.json(
        { error: "categoryName and categoryPrompt are required" },
        { status: 400 }
      );
    }

    console.log(`🔄 Regenerating question for "${categoryName}" (${pointValue} pts)`);

    // Convert point value to 1-10 difficulty
    const difficulty = pointValueToDifficulty(pointValue || 400);

    // Build state object
    const state: GenerationState = generationState || {
      seen_answers: [],
      seen_topics: [],
      seen_clues: [],
      favorite_clues: [],
      disliked_clues: [],
    };

    console.log("📊 Generation state being used:", {
      answers: state.seen_answers.length,
      topics: state.seen_topics.length,
      clues: state.seen_clues.length,
      seenAnswers: state.seen_answers.slice(0, 5), // First 5 for debugging
    });

    // Add current clue to seen lists before regenerating
    if (currentClue && currentAnswer) {
      if (!state.seen_clues.includes(currentClue)) {
        state.seen_clues.push(currentClue);
      }
      if (!state.seen_answers.includes(currentAnswer)) {
        state.seen_answers.push(currentAnswer);
      }
    }

    // Build comprehensive prompt
    const systemPrompt = buildClueGenerationPrompt({
      category: categoryName,
      categoryPrompt,
      difficulty,
      mode: "refresh",
      state,
    });

    const baseUserMessage = `Generate ONE fresh Jeopardy clue for "${categoryName}" at difficulty ${difficulty}/10.`;
    const maxAttempts = 3;
    let question = "";
    let answer = "";
    let topicTags: string[] = [];
    let qualityCheck: unknown;
    let lastDuplicateAnswer = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const userMessage = attempt === 0
        ? baseUserMessage
        : `${baseUserMessage} Do not use the duplicate answer "${lastDuplicateAnswer}". Choose a completely different subject and answer.`;

      let msg;
      try {
        msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          temperature: Math.min(1, REFRESH_TEMPERATURE + attempt * 0.05),
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });
        console.log(`✅ Question regeneration API responded (attempt ${attempt + 1}/${maxAttempts})`);
      } catch (apiError: unknown) {
        console.error("❌ Question regeneration API call failed:", apiError);
        throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }

      const text = msg.content?.[0]?.type === "text" ? msg.content[0].text.trim() : "";
      if (!text) throw new Error("No response from Claude API");

      let cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/,"").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleaned = jsonMatch[0];

      let data;
      try {
        data = JSON.parse(cleaned);
      } catch {
        console.error("❌ Question regeneration JSON parse failed. Raw text:", text);
        throw new Error("Failed to parse question response");
      }

      question = data.clue || data.question;
      answer = data.response || data.answer;
      topicTags = data.topic_tags || [];
      qualityCheck = data.quality_check;

      if (!question || !answer) throw new Error("Invalid question response structure");

      if (!isDuplicateAnswer(answer, state.seen_answers)) break;

      lastDuplicateAnswer = answer;
      console.warn(`⚠️ Duplicate refresh answer "${answer}" (attempt ${attempt + 1}/${maxAttempts})`);
      if (attempt === maxAttempts - 1) {
        throw new Error(`Unable to generate a unique answer after ${maxAttempts} attempts`);
      }
    }

    return NextResponse.json({
      question,
      answer,
      topicTags,
      _debug: {
        provider: "claude",
        model: "claude-sonnet-4-6",
        difficulty,
        qualityCheck,
      }
    });
  } catch (err: unknown) {
    console.error("Question generation error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
