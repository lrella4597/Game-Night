import { test } from "node:test";
import assert from "node:assert/strict";
import { skipperHint } from "./clueText.ts";

const group = ["Alyssa", "Jake", "Jess", "Kevin", "Luke", "Sydney", "Tom", "Will"];

test("skipper hint halves the suspects and includes the skipper", () => {
  // A J J K | L S T W
  assert.equal(skipperHint(group, "Jake"), "a letter from A to K");
  assert.equal(skipperHint(group, "Sydney"), "a letter from L to Z");
});

test("skipper hint never singles someone out", () => {
  // Alyssa would be alone below J, so she is grouped with more players
  assert.equal(skipperHint(["Alyssa", "Jake", "Kevin", "Luke"], "Alyssa"), "a letter from A to J");
});

test("no hint for tiny groups or when everyone shares an initial", () => {
  assert.equal(skipperHint(["Jake", "Jess", "Kevin"], "Jake"), null);
  assert.equal(skipperHint(["Jake", "Jess", "Jo", "Jim"], "Jake"), null);
  assert.equal(skipperHint(group, "9lives"), null);
});
