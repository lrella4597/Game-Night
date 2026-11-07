import Anthropic from "@anthropic-ai/sdk";
import { PACK_PART_EFFORT, PACK_PART_MODEL } from "@/lib/ai/models";
import { PACK_PARTS, PART_SYSTEM_PROMPT, getPartUserMessage } from "@/lib/chat/customizeTodayParts";

export interface PartOutcome {
  key: string;
  ok: boolean;
  ms: number;
  data?: unknown;
  error?: unknown;
}

// Thinking settings per model: thinking off where the model allows it.
// Opus 5.5 can't turn thinking off, so it relies on low effort instead.
function thinkingFor(model: string): Anthropic.ThinkingConfigParam | undefined {
  if (model.includes("opus")) return undefined;
  if (model.includes("sonnet")) return { type: "between_tools" } as unknown as Anthropic.ThinkingConfigParam;
  return { type: "disabled" };
}

/** Generate every pack part in parallel. Parts that fail or time out are reported, not thrown. */
export async function generatePackParts(
  anthropic: Anthropic,
  message: string,
  conversationHistory: string | undefined,
  { model = PACK_PART_MODEL, timeoutMs }: { model?: string; timeoutMs: number }
): Promise<PartOutcome[]> {
  const thinking = thinkingFor(model);
  return Promise.all(
    PACK_PARTS.map(async (part): Promise<PartOutcome> => {
      const started = Date.now();
      try {
        const response = await anthropic.messages.create(
          {
            model,
            max_tokens: part.maxTokens,
            ...(thinking ? { thinking } : {}),
            system: PART_SYSTEM_PROMPT,
            output_config: {
              effort: PACK_PART_EFFORT,
              format: { type: "json_schema", schema: part.schema as Record<string, unknown> },
            },
            messages: [{ role: "user", content: getPartUserMessage(part, message, conversationHistory) }],
          },
          { timeout: timeoutMs, maxRetries: 0 }
        );
        if (response.stop_reason === "refusal") throw new Error(`Refused: ${part.key}`);
        if (response.stop_reason === "max_tokens") throw new Error(`Ran out of room: ${part.key}`);
        const text = response.content.find((b) => b.type === "text");
        if (!text || text.type !== "text") throw new Error(`No text in ${part.key}`);
        return { key: part.key, ok: true, ms: Date.now() - started, data: JSON.parse(text.text) };
      } catch (error) {
        return { key: part.key, ok: false, ms: Date.now() - started, error };
      }
    })
  );
}
