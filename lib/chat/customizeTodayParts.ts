import { CUSTOMIZE_TODAY_SYSTEM_PROMPT } from "./customizeTodayPrompt.ts";
import { CUSTOMIZE_TODAY_OUTPUT_SCHEMA } from "./customizeTodayResponse.ts";
import type { CustomizeTodayResponse } from "./types";

// Generating the whole pack (15-20 missions + 8-12 events) in one call takes
// 20-30 seconds, longer than the hosting platform lets a request run, so the
// host saw a generic error. Instead the pack is generated as several small
// pieces in parallel and merged; the slowest piece decides the wait.

type Mission = CustomizeTodayResponse["mission_pack"][number];
type GameEvent = CustomizeTodayResponse["event_pack"][number];

const props = CUSTOMIZE_TODAY_OUTPUT_SCHEMA.properties;

// System prompt for every piece: the game rules, safety rules and defaults,
// without the whole-pack response format and item counts.
function section(name: string): string {
  const start = CUSTOMIZE_TODAY_SYSTEM_PROMPT.indexOf(`# ${name}`);
  if (start < 0) return "";
  const next = CUSTOMIZE_TODAY_SYSTEM_PROMPT.indexOf("\n# ", start + 1);
  return CUSTOMIZE_TODAY_SYSTEM_PROMPT.slice(start, next < 0 ? undefined : next).trim();
}

export const PART_SYSTEM_PROMPT = [
  CUSTOMIZE_TODAY_SYSTEM_PROMPT.slice(0, CUSTOMIZE_TODAY_SYSTEM_PROMPT.indexOf("# RESPONSE FORMAT")).trim(),
  section("MISSION PACK REQUIREMENTS"),
  section("EVENT PACK REQUIREMENTS"),
  section("SAFETY RULES (STRICTLY ENFORCED)"),
  section("DEFAULTS FOR MISSING CONTEXT"),
  `# THIS REQUEST
You are generating ONE PART of the pack. Other parts are generated separately and merged, so produce only what the part instructions ask for, in the exact JSON shape required. The part instructions override any counts above. Keep mission text to 1-2 sentences and event instructions to 3-5 sentences.`,
].join("\n\n");

export interface PackPart {
  key: string;
  instructions: string;
  schema: object;
  maxTokens: number;
}

const missionsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mission_pack"],
  properties: { mission_pack: props.mission_pack },
} as const;

const eventsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event_pack"],
  properties: { event_pack: props.event_pack },
} as const;

// Small pieces (2-3 items each) so every call finishes in a few seconds.
// Measured on Haiku 4.5: ~6 missions or ~4 events per call took 4-10s,
// too close to the platform limit once its own overhead is added.
const MISSION_PARTS: [string, string, string][] = [
  ["social", "low", "2 low and 1 medium"],
  ["social", "high", "1 medium and 2 high"],
  ["conversational", "low", "2 low and 1 medium"],
  ["conversational", "high", "1 medium and 2 high"],
  ["sneaky", "low", "2 low and 1 medium"],
  ["sneaky", "high", "1 medium and 2 high"],
];

const CATEGORY_HINT: Record<string, string> = {
  social: "interacting with specific people",
  conversational: "steering conversations",
  sneaky: "physical actions without being noticed",
};

const EVENT_PARTS: [string, string][] = [
  ["active", "physical/active"],
  ["competitive", "competitive"],
  ["debate", "conversation/debate"],
  ["creative", "creative/collaborative"],
];

export const PACK_PARTS: PackPart[] = [
  {
    key: "summary",
    instructions:
      "Part: summary only. Write assistant_message: 2-4 enthusiastic sentences telling the host you built a custom pack of about 18 Deceiver missions and 8 group events tailored to their event, mentioning a couple of specific ways it fits their setting. Then fill context_summary from the host's request (playerCount null if not given; conversationHistory: one-line recap of what the host asked for).",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["assistant_message", "context_summary"],
      properties: {
        assistant_message: props.assistant_message,
        context_summary: props.context_summary,
      },
    },
    maxTokens: 800,
  },
  ...MISSION_PARTS.map(([category, tier, mix]) => ({
    key: `missions-${category}-${tier}`,
    instructions: `Part: missions only. Generate exactly 3 missions, all with category "${category}" (${CATEGORY_HINT[category]}). Risk levels: ${mix}.`,
    schema: missionsSchema,
    maxTokens: 800,
  })),
  ...EVENT_PARTS.map(([key, kind]) => ({
    key: `events-${key}`,
    instructions: `Part: events only. Generate exactly 2 ${kind} events, each with a deceiverSecretMission.`,
    schema: eventsSchema,
    maxTokens: 1200,
  })),
];

export function getPartUserMessage(part: PackPart, userInput: string, conversationHistory?: string): string {
  const history = conversationHistory ? `Previous conversation:\n${conversationHistory}\n\n` : "";
  return `${history}Host's request: ${userInput}\n\nUse sensible defaults for any missing details. ${part.instructions}`;
}

/** Merge the pieces into one pack with fresh, unique ids (m1.., e1..). */
export function mergePackParts(results: Record<string, unknown>): CustomizeTodayResponse {
  const missions: Mission[] = [];
  const events: GameEvent[] = [];
  let summary: Pick<CustomizeTodayResponse, "assistant_message" | "context_summary"> | null = null;

  for (const part of PACK_PARTS) {
    const r = results[part.key] as Partial<CustomizeTodayResponse> | undefined;
    if (!r) continue;
    if (Array.isArray(r.mission_pack)) missions.push(...r.mission_pack);
    if (Array.isArray(r.event_pack)) events.push(...r.event_pack);
    if (typeof r.assistant_message === "string" && r.context_summary) {
      summary = { assistant_message: r.assistant_message, context_summary: r.context_summary };
    }
  }

  if (missions.length === 0 || events.length === 0) {
    throw new Error("Couldn't generate a complete pack. Please try again.");
  }

  return {
    assistant_message:
      summary?.assistant_message ??
      `Here's your custom pack: ${missions.length} Deceiver missions and ${events.length} group events.`,
    mission_pack: missions.map((m, i) => ({ ...m, id: `m${i + 1}` })),
    event_pack: events.map((e, i) => ({ ...e, id: `e${i + 1}` })),
    context_summary: summary?.context_summary ?? {
      theme: "",
      setting: "",
      playerCount: null,
      additionalNotes: "",
      conversationHistory: "",
    },
  } as CustomizeTodayResponse;
}
