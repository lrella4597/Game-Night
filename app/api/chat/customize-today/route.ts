import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMIZE_TODAY_SYSTEM_PROMPT,
  getCustomizeTodayUserMessage,
} from "@/lib/chat/customizeTodayPrompt";

const MAX_RETRIES = 2;

export async function POST(req: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    let lastError: string | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Call Claude API with structured output
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8000,
          temperature: 0.8,
          system: CUSTOMIZE_TODAY_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: getCustomizeTodayUserMessage(message, conversationHistory),
            },
          ],
        });

        const textContent = response.content.find(
          (block) => block.type === "text"
        );
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text content in response");
        }

        let responseText = textContent.text;

        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          responseText = jsonMatch[1];
        }

        // Parse the JSON response
        const parsedResponse = JSON.parse(responseText);

        // Validate response structure
        if (!parsedResponse.assistant_message) {
          throw new Error("Missing assistant_message in response");
        }

        if (
          !Array.isArray(parsedResponse.mission_pack) ||
          !Array.isArray(parsedResponse.event_pack)
        ) {
          throw new Error("Missing or invalid mission_pack or event_pack arrays");
        }

        // Ensure unique IDs on mission_pack items
        parsedResponse.mission_pack = parsedResponse.mission_pack.map(
          (item: any, index: number) => ({
            ...item,
            id: item.id || `m${index + 1}`,
          })
        );

        // Ensure unique IDs on event_pack items
        parsedResponse.event_pack = parsedResponse.event_pack.map(
          (item: any, index: number) => ({
            ...item,
            id: item.id || `e${index + 1}`,
          })
        );

        return NextResponse.json({
          success: true,
          response: parsedResponse,
        });
      } catch (parseError) {
        lastError =
          parseError instanceof Error
            ? parseError.message
            : "Unknown parse error";
        console.error(
          `Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
          lastError
        );

        // If this was the last retry, fall through to error response
        if (attempt === MAX_RETRIES) {
          break;
        }
      }
    }

    // All retries exhausted
    return NextResponse.json(
      {
        error: "Failed to get valid response after retries",
        details: lastError,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in customize-today chat:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
