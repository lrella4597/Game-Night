import assert from "node:assert/strict";
import test from "node:test";

import { LONG_FORM_CHAT_MODEL } from "./models.ts";

test("long-form game chat uses the fast model to stay inside Netlify timeout", () => {
  assert.equal(LONG_FORM_CHAT_MODEL, "claude-haiku-4-5-20251001");
});

test("Customize Today pieces use the current Haiku", async () => {
  const { PACK_PART_MODEL } = await import("./models.ts");
  assert.equal(PACK_PART_MODEL, "claude-haiku-5-5");
});
