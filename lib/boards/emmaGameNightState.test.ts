import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmmaGameState,
  resolveEmmaClue,
  type EmmaGameState,
} from "./emmaGameNightState.ts";

test("resolving a clue awards the selected player and marks the clue used", () => {
  const initial = createEmmaGameState();
  const next = resolveEmmaClue(initial, "emma-year-200", "emma", 200);

  assert.equal(next.scores.emma, 200);
  assert.equal(next.scores.luke, 0);
  assert.deepEqual(next.usedQuestionIds, ["emma-year-200"]);
});

test("resolving without a winner marks the clue used without changing scores", () => {
  const initial: EmmaGameState = {
    scores: { luke: 400, emma: 600 },
    usedQuestionIds: [],
  };
  const next = resolveEmmaClue(initial, "emma-year-400", null, 400);

  assert.deepEqual(next.scores, initial.scores);
  assert.deepEqual(next.usedQuestionIds, ["emma-year-400"]);
});

test("a used clue cannot be scored twice", () => {
  const first = resolveEmmaClue(createEmmaGameState(), "emma-year-600", "luke", 600);
  const second = resolveEmmaClue(first, "emma-year-600", "luke", 600);

  assert.deepEqual(second, first);
});
