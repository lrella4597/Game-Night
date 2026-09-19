import assert from "node:assert/strict";
import test from "node:test";

import { LONG_FORM_CHAT_MODEL } from "./models.ts";

test("long-form game chat uses the fast model to stay inside Netlify timeout", () => {
  assert.equal(LONG_FORM_CHAT_MODEL, "claude-haiku-4-5-20251001");
});
