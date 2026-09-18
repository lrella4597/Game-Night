import assert from "node:assert/strict";
import test from "node:test";

import { EMMA_GAME_NIGHT_BOARD } from "./emmaGameNight.ts";

test("Emma game-night board has six complete escalating categories", () => {
  assert.equal(EMMA_GAME_NIGHT_BOARD.columns.length, 6);
  assert.deepEqual(EMMA_GAME_NIGHT_BOARD.rowValues, [200, 400, 600, 800, 1000]);

  for (const column of EMMA_GAME_NIGHT_BOARD.columns) {
    assert.equal(column.questions.length, 5, column.title);
    assert.deepEqual(
      column.questions.map((question) => question.value),
      EMMA_GAME_NIGHT_BOARD.rowValues,
      column.title
    );
    assert.ok(column.questions.every((question) => question.question.trim()));
    assert.ok(column.questions.every((question) => question.answer.trim()));
  }
});

test("Emma game-night board does not recycle answers", () => {
  const answers = EMMA_GAME_NIGHT_BOARD.columns.flatMap((column) =>
    column.questions.map((question) => question.answer.trim().toLowerCase())
  );

  assert.equal(new Set(answers).size, answers.length);
});

test("Emma game-night board uses the party-trivia mix from prior boards", () => {
  assert.deepEqual(
    EMMA_GAME_NIGHT_BOARD.columns.map((column) => column.title),
    [
      "NAME THAT YEAR",
      "NOSTALGIA",
      "MOVIES & TV",
      "FOOD & BRANDS",
      "SPORTS NICKNAMES",
      "ODDBALL KNOWLEDGE",
    ]
  );
});
