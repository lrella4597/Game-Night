import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { BOARD_BUILDER_SYSTEM_PROMPT, getUserMessage } from "@/lib/chat/boardBuilderPrompt";
import { LONG_FORM_CHAT_MODEL } from "@/lib/ai/models";

export async function POST(req: NextRequest) {
  try {
    // Verify API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not configured");
      return NextResponse.json(
        { error: "AI service is not configured. Please contact the administrator." },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Call Claude API with structured output
    const response = await anthropic.messages.create({
      model: LONG_FORM_CHAT_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: BOARD_BUILDER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: getUserMessage(message, conversationHistory),
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
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
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", responseText);
      return NextResponse.json(
        {
          error: "Invalid JSON response from assistant",
          rawResponse: responseText,
        },
        { status: 500 }
      );
    }

    // Validate response structure
    if (!parsedResponse.assistant_message || !parsedResponse.actions) {
      return NextResponse.json(
        {
          error: "Invalid response structure",
          details: "Missing assistant_message or actions",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: parsedResponse,
    });
  } catch (error) {
    console.error("Error in chat board builder:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    // Distinguish between API errors and other errors
    const status = message.includes("401") || message.includes("authentication")
      ? 503  // API key invalid
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
