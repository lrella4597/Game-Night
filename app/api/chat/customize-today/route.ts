import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  CUSTOMIZE_TODAY_SYSTEM_PROMPT,
  getCustomizeTodayUserMessage,
} from "@/lib/chat/customizeTodayPrompt";
import { LONG_FORM_CHAT_MODEL } from "@/lib/ai/models";
import {
  CUSTOMIZE_TODAY_OUTPUT_SCHEMA,
  parseCustomizeTodayResponse,
} from "@/lib/chat/customizeTodayResponse";

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

    const response = await anthropic.messages.create({
      model: LONG_FORM_CHAT_MODEL,
      max_tokens: 8000,
      temperature: 0.8,
      system: CUSTOMIZE_TODAY_SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: CUSTOMIZE_TODAY_OUTPUT_SCHEMA,
        },
      },
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

    const parsedResponse = parseCustomizeTodayResponse(textContent.text);

    return NextResponse.json({
      success: true,
      response: parsedResponse,
    });
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
