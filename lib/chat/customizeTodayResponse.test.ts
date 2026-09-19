import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOMIZE_TODAY_OUTPUT_SCHEMA,
  parseCustomizeTodayResponse,
} from "./customizeTodayResponse.ts";
import {
  CUSTOMIZE_TODAY_SYSTEM_PROMPT,
  getCustomizeTodayUserMessage,
} from "./customizeTodayPrompt.ts";

test("Day of Deception always requests a complete JSON pack instead of prose clarification", () => {
  assert.equal(
    CUSTOMIZE_TODAY_SYSTEM_PROMPT.toLowerCase().includes("ask 1-2 clarifying questions"),
    false
  );
  assert.match(CUSTOMIZE_TODAY_SYSTEM_PROMPT, /infer sensible defaults/i);
  assert.equal(CUSTOMIZE_TODAY_OUTPUT_SCHEMA.type, "object");
  assert.match(
    getCustomizeTodayUserMessage("Customize today"),
    /generate the complete pack now using sensible defaults/i
  );
  assert.deepEqual(CUSTOMIZE_TODAY_OUTPUT_SCHEMA.required, [
    "assistant_message",
    "mission_pack",
    "event_pack",
    "context_summary",
  ]);
});

test("parses a structured Day of Deception pack", () => {
  const response = parseCustomizeTodayResponse(
    JSON.stringify({
      assistant_message: "Your pack is ready.",
      mission_pack: [
        {
          id: "m1",
          text: "Get someone to recommend a movie.",
          category: "social",
          riskLevel: "low",
          tags: ["indoor"],
        },
      ],
      event_pack: [
        {
          id: "e1",
          name: "Story Circle",
          instructions: "Take turns adding one sentence to a shared story.",
          durationMinutes: 10,
          deceiverSecretMission: "Introduce a specific word twice.",
          tags: ["creative"],
        },
      ],
      context_summary: {
        theme: "Game night",
        setting: "Indoor home",
        playerCount: 10,
        additionalNotes: "Accessible activities",
        conversationHistory: "",
      },
    })
  );

  assert.equal(response.mission_pack[0].id, "m1");
  assert.equal(response.event_pack[0].name, "Story Circle");
});

test("rejects prose instead of retrying an invalid JSON contract", () => {
  assert.throws(
    () => parseCustomizeTodayResponse("I appreciate the context. Could you clarify?"),
    /valid JSON/i
  );
});
