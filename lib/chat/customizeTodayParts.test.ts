import { test } from "node:test";
import assert from "node:assert/strict";
import { PACK_PARTS, PART_SYSTEM_PROMPT, mergePackParts } from "./customizeTodayParts.ts";

const mission = (text: string) => ({ id: "m1", text, category: "social", riskLevel: "low", tags: [] });
const event = (name: string) => ({
  id: "e1", name, instructions: "Do it.", durationMinutes: 10, deceiverSecretMission: null, tags: [],
});

test("merges parts and renumbers ids", () => {
  const pack = mergePackParts({
    summary: { assistant_message: "Hi", context_summary: { theme: "bbq", setting: "yard", playerCount: 12, additionalNotes: "", conversationHistory: "" } },
    "missions-social-low": { mission_pack: [mission("a"), mission("b")] },
    "missions-sneaky-high": { mission_pack: [mission("c")] },
    "events-active": { event_pack: [event("x")] },
    "events-debate": { event_pack: [event("y")] },
  });
  assert.equal(pack.assistant_message, "Hi");
  assert.deepEqual(pack.mission_pack.map((m) => m.id), ["m1", "m2", "m3"]);
  assert.deepEqual(pack.event_pack.map((e) => e.id), ["e1", "e2"]);
});

test("works without the summary part", () => {
  const pack = mergePackParts({
    "missions-social-low": { mission_pack: [mission("a")] },
    "events-active": { event_pack: [event("x")] },
  });
  assert.match(pack.assistant_message, /1 Deceiver missions and 1 group events/);
});

test("fails when there are no missions or no events", () => {
  assert.throws(() => mergePackParts({ "missions-social-low": { mission_pack: [mission("a")] } }));
});

test("part prompt keeps the safety rules but not the whole-pack format", () => {
  assert.match(PART_SYSTEM_PROMPT, /SAFETY RULES/);
  assert.doesNotMatch(PART_SYSTEM_PROMPT, /# RESPONSE FORMAT/);
  assert.equal(new Set(PACK_PARTS.map((p) => p.key)).size, PACK_PARTS.length);
});
