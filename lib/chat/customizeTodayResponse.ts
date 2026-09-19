import type { CustomizeTodayResponse } from "./types";

export const CUSTOMIZE_TODAY_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "assistant_message",
    "mission_pack",
    "event_pack",
    "context_summary",
  ],
  properties: {
    assistant_message: { type: "string" },
    mission_pack: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text", "category", "riskLevel", "tags"],
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          category: {
            type: "string",
            enum: ["social", "conversational", "sneaky"],
          },
          riskLevel: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    event_pack: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "name",
          "instructions",
          "durationMinutes",
          "deceiverSecretMission",
          "tags",
        ],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          instructions: { type: "string" },
          durationMinutes: { type: "number" },
          deceiverSecretMission: { type: ["string", "null"] },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    context_summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "theme",
        "setting",
        "playerCount",
        "additionalNotes",
        "conversationHistory",
      ],
      properties: {
        theme: { type: "string" },
        setting: { type: "string" },
        playerCount: { type: ["number", "null"] },
        additionalNotes: { type: "string" },
        conversationHistory: { type: "string" },
      },
    },
  },
} as const;

export function parseCustomizeTodayResponse(
  responseText: string
): CustomizeTodayResponse {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI response was not a JSON object");
  }

  const response = parsed as Partial<CustomizeTodayResponse>;
  if (
    typeof response.assistant_message !== "string" ||
    !Array.isArray(response.mission_pack) ||
    !Array.isArray(response.event_pack) ||
    !response.context_summary
  ) {
    throw new Error("AI response did not contain a complete game pack");
  }

  return response as CustomizeTodayResponse;
}
