import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { pointValueToDifficulty } from "@/lib/prompts/clueGenerationPrompt";
import type { GenerationState } from "@/lib/data/useGenerationState";

interface ColumnRequest {
  categoryId: string;
  categoryName: string;
  categoryPrompt: string;
  rowValues: number[];
}

interface RequestBody {
  columns: ColumnRequest[];
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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const body: RequestBody = await req.json();
    const { columns, generationState } = body;

    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: "columns array is required" },
        { status: 400 }
      );
    }

    // Verify API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY is not set in environment variables");
      throw new Error("API key not configured - restart dev server after adding .env.local");
    }

    console.log(`🎲 Generating full board with ${columns.length} columns`);

    // Build state object (shared across all columns)
    const state: GenerationState = generationState || {
      seen_answers: [],
      seen_topics: [],
      seen_clues: [],
      favorite_clues: [],
      disliked_clues: [],
    };

    // Generate each column using Claude API (in parallel, tolerating individual failures)
    const settled = await Promise.allSettled(
      columns.map(async (col) => {
        const { categoryName, categoryPrompt, rowValues } = col;

        if (!categoryPrompt) {
          throw new Error(`Column "${categoryName}" has no categoryPrompt`);
        }

        console.log(`🎯 Generating column "${categoryName}"...`);

        // Map point values to difficulties
        const sortedValues = [...rowValues].sort((a, b) => a - b);
        const difficulties = sortedValues.map(v => pointValueToDifficulty(v));

        // Build prompt for this column
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

        const userMessage = `Generate ${rowValues.length} diverse Jeopardy questions for "${categoryName}"`;

        let msg;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let items: any[] | undefined;
        let retryCount = 0;
        const maxRetries = 3;

        // Retry loop to handle duplicate answers and content filter blocks
        while (retryCount < maxRetries) {
          try {
            msg = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 3000,
              temperature: 0.5 + retryCount * 0.1,
              system: systemPrompt,
              messages: [{ role: "user", content: retryCount > 0
                ? `Generate ${rowValues.length} diverse Jeopardy questions for "${categoryName}". Use different angles and topics than typical.`
                : userMessage }],
            });
            console.log(`✅ Generated "${categoryName}"`);
          } catch (apiError: unknown) {
            const errMsg = apiError instanceof Error ? apiError.message : String(apiError);
            const isContentFilter = errMsg.includes("content filtering") || errMsg.includes("blocked");
            console.error(`❌ API call failed for "${categoryName}":`, errMsg);

            if (isContentFilter && retryCount < maxRetries - 1) {
              retryCount++;
              console.warn(`⚠️ Content filter hit for "${categoryName}", retrying (${retryCount}/${maxRetries})...`);
              continue;
            }
            throw new Error(`API call failed for ${categoryName}: ${errMsg}`);
          }

          const text = msg.content?.[0]?.type === "text" ? msg.content[0].text.trim() : "";
          if (!text) {
            throw new Error(`Empty response from Claude for "${categoryName}"`);
          }

          const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

          try {
            items = JSON.parse(cleaned);
          } catch (parseError) {
            console.error(`❌ JSON parse failed for "${categoryName}". Raw text:`, text);
            throw new Error(`Failed to parse response for ${categoryName}`);
          }

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
              throw new Error(`Unable to generate ${rowValues.length} unique questions for "${categoryName}" after ${maxRetries} attempts`);
            }
          }
        }

        // Ensure items was assigned
        if (!items) {
          throw new Error(`No items generated for "${categoryName}"`);
        }

        // Normalize response format
        const normalizedItems = items.map(item => ({
          value: item.value,
          question: item.question || item.clue,
          answer: item.answer || item.response,
          topicTags: item.topic_tags || item.topicTags || [],
          difficulty: item.difficulty,
        }));

        return {
          categoryId: col.categoryId,
          items: normalizedItems,
        };
      })
    );

    // Extract successful results, log failures
    const result = [];
    const failures = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        result.push(s.value);
      } else {
        console.error("Column generation failed:", s.reason);
        failures.push(String(s.reason));
      }
    }

    if (result.length === 0) {
      throw new Error(`All columns failed to generate. Errors: ${failures.join("; ")}`);
    }

    if (failures.length > 0) {
      console.warn(`⚠️ ${failures.length} column(s) failed, ${result.length} succeeded`);
    }

    console.log(`✅ Board generated (${result.length}/${columns.length} columns)`);

    return NextResponse.json({
      columns: result,
      _debug: {
        provider: "claude",
        model: "claude-sonnet-4-6",
        columnsGenerated: result.length,
        columnsFailed: failures.length,
      }
    });
  } catch (err: unknown) {
    console.error("Board generation error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
