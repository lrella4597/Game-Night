import test from "node:test";
import assert from "node:assert/strict";

import {
  buildQuestionRefreshBody,
  isDuplicateAnswer,
  normalizeAnswer,
  REFRESH_TEMPERATURE,
} from "./questionRefresh.ts";

const generationState = {
  seen_answers: ["The Eiffel Tower"],
  seen_topics: ["Paris landmarks"],
  seen_clues: ["This iron landmark opened in 1889."],
  favorite_clues: [],
  disliked_clues: [],
};

test("buildQuestionRefreshBody always carries generation state and current content", () => {
  const body = buildQuestionRefreshBody({
    categoryName: "Landmarks",
    categoryPrompt: "Famous structures",
    pointValue: 400,
    generationState,
    currentClue: "This Paris tower was built for the 1889 World's Fair.",
    currentAnswer: "Eiffel Tower",
  });

  assert.deepEqual(body.generationState.seen_answers, [
    "The Eiffel Tower",
    "Eiffel Tower",
  ]);
  assert.deepEqual(body.generationState.seen_clues, [
    "This iron landmark opened in 1889.",
    "This Paris tower was built for the 1889 World's Fair.",
  ]);
  assert.equal(body.currentAnswer, "Eiffel Tower");
});

test("refresh generation starts at a higher creative temperature", () => {
  assert.equal(REFRESH_TEMPERATURE, 0.9);
});

test("normalizeAnswer ignores Jeopardy phrasing, articles, punctuation, and casing", () => {
  assert.equal(normalizeAnswer("What is The Eiffel Tower?"), "eiffel tower");
  assert.equal(normalizeAnswer("An Eiffel-Tower"), "eiffel tower");
});

test("isDuplicateAnswer catches normalized answers already seen", () => {
  assert.equal(isDuplicateAnswer("What is Eiffel Tower?", generationState.seen_answers), true);
  assert.equal(isDuplicateAnswer("Louvre Museum", generationState.seen_answers), false);
});
