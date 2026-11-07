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
  `# WHAT MAKES A GREAT CHALLENGE
The whole point of the game is that it's genuinely funny and feels made for THIS group on THIS day. Think reality-TV secret missions: the Deceiver has to pull off something specific and slightly absurd in plain sight while everyone else wonders why they're acting weird.

- Build on the actual details the host gave you: use people's names, their jobs, what's going on with them today, the venue and what's there (menus, taps, games, staff), the time of day. A mission that could be used at any party is a weak mission.
- Make them specific and checkable, with a clear finish line: "Get Jake to demonstrate a stretch on someone other than you" beats "talk to Jake about his job".
- Aim for laughs: absurd but doable, a little bold, the kind of thing that makes the table erupt when it's revealed later. Wordplay, fake confidence, running bits, callbacks and harmless chaos are all good.
- Tease kindly. If someone is recovering, sick, tired or has a baby with them, missions can play with the situation warmly but never make it harder for them, involve the baby physically, or make anyone the butt of a joke.
- Vary the texture: quick one-liners, slow-burn long cons, missions that need an accomplice who doesn't know they're helping.

# THE SKETCHINESS DIAL (most important)
Every mission must sit in the sweet spot: subtly sketchy.
- Too small (reject): something a person would do anyway, or that nobody could ever find suspicious. "Ask Jake a question about his job." "Compliment someone's drink."
- Too blatant (reject): so weird or forced that everyone instantly knows it's a mission, or that needs an obviously strange request out of nowhere.
- Just right: it takes real effort, nerve or a bit of a long con to pull off, and an attentive player COULD notice something off ("why does she keep steering us to talk about the parade?"), but the Deceiver can always play it off as normal. It leaves a trail of small clues the table can piece together at the roundtable.
- Give each mission a concrete, verifiable win condition (who has to say or do what, how many times, by when) so the Deceiver knows exactly when they've succeeded.
- Before writing each mission, picture it happening at this table. If it's forgettable or would get the Deceiver caught in ten seconds, write a better one.

# EVENTS MUST BE ACTUALLY DOABLE
- Playable right where the group is, with what's realistically there (tables, chairs, phones, napkins, menus, coasters, whatever the venue has) plus nothing anyone would need to bring or buy.
- Explainable in under a minute, playable in 5-20 minutes, and fun even for people who aren't Deceivers.
- Nothing embarrassing, risky or disruptive to other customers or staff: no nudity, no leaving the venue, no shouting or running in a public place, nothing involving alcohol amounts, nothing that needs someone to be physically capable of more than they are today.
- The Deceiver's secret objective inside the event should be subtly sketchy by the same dial above.

# THIS REQUEST
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

// Small pieces so every call finishes in a few seconds even on a stronger
// model. Parts run in parallel and can't see each other, so each gets its own
// angle to keep the pack varied (otherwise they repeat the same idea).
const MISSION_PARTS: { category: string; angle: string; risk: string }[] = [
  { category: "social", angle: "built on one specific person's job, hobby or what's going on with them today", risk: "1 low and 1 medium" },
  { category: "social", angle: "pulling two people into the same bit without them realizing they're connected", risk: "1 medium and 1 high" },
  { category: "social", angle: "involving staff, strangers or the venue itself (politely)", risk: "1 low and 1 high" },
  { category: "conversational", angle: "a made-up fact, rumor or tradition about the venue, the town or the occasion that others start repeating", risk: "1 low and 1 medium" },
  { category: "conversational", angle: "a running bit, catchphrase or fake confidence the Deceiver keeps up over time", risk: "1 medium and 1 high" },
  { category: "conversational", angle: "steering the group into a debate, vote or story without revealing you started it", risk: "1 low and 1 high" },
  { category: "sneaky", angle: "objects around you (coasters, menus, napkins, game pieces), never anyone's food, drink or belongings", risk: "1 low and 1 medium" },
  { category: "sneaky", angle: "seating, positions or where things are, changing it so smoothly nobody can say when it happened", risk: "1 medium and 1 high" },
  { category: "sneaky", angle: "spreading a habit, gesture or phrase to others without ever asking them to do it", risk: "1 low and 1 high" },
];

const CATEGORY_HINT: Record<string, string> = {
  social: "interacting with specific people",
  conversational: "steering conversations",
  sneaky: "physical actions without being noticed",
};

const EVENT_PARTS: [string, string][] = [
  ["active", "light physical/active challenge that suits the venue"],
  ["competitive", "head-to-head or team competition"],
  ["debate", "debate, hot takes or mock trial"],
  ["creative", "creative/collaborative make-something-together"],
  ["guessing", "guessing or bluffing party game"],
  ["improv", "storytelling or improv performance"],
  ["trivia", "trivia or quiz built around the group and the setting"],
  ["ceremony", "awards, toasts or ceremony to cap the night"],
];

export const PACK_PARTS: PackPart[] = [
  {
    key: "summary",
    instructions:
      "Part: summary only. Write assistant_message: 2-4 enthusiastic sentences telling the host you built a custom pack of 18 Deceiver missions and 8 group events tailored to their event, mentioning a couple of specific ways it fits their setting. Then fill context_summary from the host's request (playerCount null if not given; conversationHistory: one-line recap of what the host asked for).",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["assistant_message", "context_summary"],
      properties: {
        assistant_message: props.assistant_message,
        context_summary: props.context_summary,
      },
    },
    maxTokens: 4000,
  },
  ...MISSION_PARTS.map(({ category, angle, risk }, i) => ({
    key: `missions-${category}-${i}`,
    instructions: `Part: missions only. Generate exactly 2 missions, both with category "${category}" (${CATEGORY_HINT[category]}). Angle for both: ${angle}. Risk levels: ${risk}.`,
    schema: missionsSchema,
    // Generous: Opus thinks before writing, and running out mid-JSON loses the part.
    // Only tokens actually used are billed.
    maxTokens: 4000,
  })),
  ...EVENT_PARTS.map(([key, kind]) => ({
    key: `events-${key}`,
    instructions: `Part: events only. Generate exactly 1 event: a ${kind}. Give it a deceiverSecretMission.`,
    schema: eventsSchema,
    maxTokens: 5000,
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
