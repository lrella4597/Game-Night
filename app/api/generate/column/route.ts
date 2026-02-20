import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { pointValueToDifficulty } from "@/lib/prompts/clueGenerationPrompt";
import type { GenerationState } from "@/lib/data/useGenerationState";

interface RequestBody {
  categoryName: string;
  categoryPrompt: string;
  rowValues: number[];
  generationState?: GenerationState;
}

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
    const { categoryName, categoryPrompt, rowValues, generationState } = body;

    if (!categoryName || !categoryPrompt || !Array.isArray(rowValues) || rowValues.length === 0) {
      return NextResponse.json(
        { error: "categoryName, categoryPrompt, and rowValues are required" },
        { status: 400 }
      );
    }

    console.log(`🎯 Generating column "${categoryName}" with ${rowValues.length} questions`);

    // Build state object
    const state: GenerationState = generationState || {
      seen_answers: [],
      seen_topics: [],
      seen_clues: [],
      favorite_clues: [],
      disliked_clues: [],
    };

    // Map point values to difficulties
    const sortedValues = [...rowValues].sort((a, b) => a - b);
    const difficulties = sortedValues.map(v => pointValueToDifficulty(v));

    // Build comprehensive prompt for multi-clue generation
    const systemPrompt = `You are generating ${rowValues.length} Jeopardy-style trivia questions for a single category.

CATEGORY: ${categoryName}

CATEGORY INSTRUCTIONS:
${categoryPrompt}

DIFFICULTY MAPPING (1-10 scale):
${sortedValues.map((val, idx) => `- ${val} points → Difficulty ${difficulties[idx]}/10`).join('\n')}

Difficulty guidance:
- 1–2: very easy / near-instant recall
- 3–4: easy / common knowledge
- 5–6: medium / requires thought
- 7–8: hard / knowledgeable players get it
- 9–10: very hard / deep cut but solvable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE MEMORY (AVOID THESE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SEEN ANSWERS: ${JSON.stringify(state.seen_answers.slice(-50))}
SEEN TOPICS: ${JSON.stringify(state.seen_topics.slice(-50))}
SEEN CLUES: ${JSON.stringify(state.seen_clues.slice(-30))}

${state.favorite_clues.length > 0 ? `
FAVORITE CLUES (imitate this style):
${JSON.stringify(state.favorite_clues.slice(-10))}
` : ''}

${state.disliked_clues.length > 0 ? `
DISLIKED CLUES (never generate similar):
${JSON.stringify(state.disliked_clues.slice(-20))}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Generate exactly ${rowValues.length} COMPLETELY UNIQUE questions
2. Each question MUST have a DIFFERENT answer (no synonyms, no variations)
3. Each question MUST be about a DIFFERENT topic/person/place/concept
4. NO answer can appear in SEEN ANSWERS
5. NO clue can be similar to SEEN CLUES
6. NO topic can repeat from SEEN TOPICS
7. Ensure maximum diversity within the category
8. Match each question's difficulty to the corresponding point value

${state.favorite_clues.length > 0 ? `
9. Imitate the clever, engaging style of FAVORITE CLUES
` : ''}

${state.disliked_clues.length > 0 ? `
10. NEVER generate anything similar to DISLIKED CLUES
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT (STRICT JSON)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY a JSON array — no markdown, no code blocks, no extra text:

[
  {
    "value": ${sortedValues[0]},
    "difficulty": ${difficulties[0]},
    "question": "...",
    "answer": "...",
    "topic_tags": ["tag1", "tag2"]
  },
  ...
]

Generate ${rowValues.length} completely different, high-quality Jeopardy clues now.`;

    const userMessage = `Generate ${rowValues.length} diverse Jeopardy questions for "${categoryName}" with point values: ${sortedValues.join(", ")}`;

    let msg;
    let items;
    let retryCount = 0;
    const maxRetries = 3;

    // Retry loop to handle duplicate answers
    while (retryCount < maxRetries) {
      try {
        msg = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
          temperature: 0.5, // Lower temperature for stricter rule following
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });
        console.log(`✅ Claude API responded for column "${categoryName}"`);
      } catch (apiError: unknown) {
        console.error(`❌ Column generation API call failed:`, apiError);
        throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : String(apiError)}`);
      }

      const text = msg.content?.[0]?.type === "text" ? msg.content[0].text.trim() : "";

      if (!text) {
        throw new Error("Empty response from Claude API");
      }

      // Strip markdown code fences if Claude added them
      const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      try {
        items = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("❌ Column generation JSON parse failed. Raw text:", text);
        throw new Error("Failed to parse column generation response");
      }

      // Ensure items is an array
      if (!Array.isArray(items)) {
        throw new Error("Response is not an array");
      }

      // Check for duplicate answers within this batch
      const answers = items.map(item => (item.answer || item.response || "").toLowerCase().trim());
      const uniqueAnswers = new Set(answers);

      if (uniqueAnswers.size === answers.length) {
        // No duplicates found, break out of retry loop
        console.log(`✅ No duplicates in column "${categoryName}"`);
        break;
      } else {
        retryCount++;
        console.warn(`⚠️ Duplicate answers detected in column "${categoryName}" (attempt ${retryCount}/${maxRetries}). Regenerating...`);

        if (retryCount >= maxRetries) {
          console.error(`❌ Failed to generate unique answers after ${maxRetries} attempts`);
          throw new Error(`Unable to generate ${rowValues.length} unique questions after ${maxRetries} attempts. Please try again.`);
        }
      }
    }

    if (!items) {
      throw new Error(`No items generated for "${categoryName}"`);
    }

    // Normalize response format (handle both old and new formats)
    const normalizedItems = items.map(item => ({
      value: item.value,
      question: item.question || item.clue,
      answer: item.answer || item.response,
      topicTags: item.topic_tags || item.topicTags || [],
      difficulty: item.difficulty,
    }));

    // Debug response
    return NextResponse.json({
      items: normalizedItems,
      _debug: {
        provider: "claude",
        model: "claude-sonnet-4-6",
        categoryName,
        numQuestions: normalizedItems.length,
      }
    });
  } catch (err: unknown) {
    console.error("Column generation error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
