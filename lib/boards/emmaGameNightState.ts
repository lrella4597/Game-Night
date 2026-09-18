export type EmmaPlayer = "luke" | "emma";

export interface EmmaGameState {
  scores: Record<EmmaPlayer, number>;
  usedQuestionIds: string[];
}

export function createEmmaGameState(): EmmaGameState {
  return {
    scores: { luke: 0, emma: 0 },
    usedQuestionIds: [],
  };
}

export function resolveEmmaClue(
  state: EmmaGameState,
  questionId: string,
  winner: EmmaPlayer | null,
  value: number
): EmmaGameState {
  if (state.usedQuestionIds.includes(questionId)) return state;

  return {
    scores: winner
      ? { ...state.scores, [winner]: state.scores[winner] + value }
      : state.scores,
    usedQuestionIds: [...state.usedQuestionIds, questionId],
  };
}
