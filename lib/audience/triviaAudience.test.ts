import assert from "node:assert/strict";
import test from "node:test";

import { createAudienceSnapshot, refreshActiveAudienceQuestion } from "./triviaAudience.ts";

const board = {
  rowValues: [200],
  columns: [
    {
      id: "movies",
      title: "MOVIES",
      categoryLibraryId: "private-prompt-id",
      questions: [
        {
          id: "movies-200",
          value: 200,
          question: "This shark movie needed a bigger boat.",
          answer: "Jaws",
        },
      ],
    },
  ],
};

const teams = [
  {
    id: "team-1",
    name: "Team One",
    color: "#ef4444",
    score: 400,
    players: ["Private Player Name"],
    powerUps: { doubleDown: false, doubleDip: false, phoneAFriend: false },
  },
];

test("audience snapshot contains gameplay display data without host-only content", () => {
  const snapshot = createAudienceSnapshot({
    board,
    usedQuestionIds: new Set(["movies-200"]),
    activeQuestion: {
      question: board.columns[0].questions[0],
      category: board.columns[0],
    },
    teams,
  });

  assert.deepEqual(snapshot.board, {
    rowValues: [200],
    columns: [
      {
        id: "movies",
        title: "MOVIES",
        questions: [{ id: "movies-200", value: 200 }],
      },
    ],
  });
  assert.deepEqual(snapshot.usedQuestionIds, ["movies-200"]);
  assert.deepEqual(snapshot.activeClue, {
    id: "movies-200",
    categoryTitle: "MOVIES",
    value: 200,
    clue: "This shark movie needed a bigger boat.",
  });
  assert.deepEqual(snapshot.teams, [
    { id: "team-1", name: "Team One", color: "#ef4444", score: 400 },
  ]);

  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("Jaws"), false);
  assert.equal(serialized.includes("private-prompt-id"), false);
  assert.equal(serialized.includes("Private Player Name"), false);
  assert.equal(serialized.includes("powerUps"), false);
});

test("refreshing the open clue immediately updates the active audience clue", () => {
  const activeQuestion = {
    question: board.columns[0].questions[0],
    category: board.columns[0],
  };

  const refreshed = refreshActiveAudienceQuestion(
    activeQuestion,
    "movies-200",
    "This Spielberg shark thriller was released in 1975.",
    "Jaws"
  );

  assert.equal(refreshed?.question.question, "This Spielberg shark thriller was released in 1975.");
  assert.equal(refreshed?.question.answer, "Jaws");
  assert.equal(refreshed?.category, activeQuestion.category);
});

test("audience snapshot supports the board-only state", () => {
  const snapshot = createAudienceSnapshot({
    board,
    usedQuestionIds: new Set(),
    activeQuestion: null,
    teams: [],
  });

  assert.equal(snapshot.activeClue, null);
  assert.deepEqual(snapshot.usedQuestionIds, []);
});
