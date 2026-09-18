import type { GenerationState } from "@/lib/data/useGenerationState";

export const REFRESH_TEMPERATURE = 0.9;

export interface QuestionRefreshInput {
  categoryName: string;
  categoryPrompt: string;
  pointValue: number;
  generationState: GenerationState;
  currentClue: string;
  currentAnswer: string;
}

export function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/^(?:what|who|where)\s+(?:is|are|was|were)\s+/i, "")
    .replace(/^(?:a|an|the)\s+/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isDuplicateAnswer(answer: string, seenAnswers: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && seenAnswers.some((seen) => normalizeAnswer(seen) === normalized);
}

function appendUnique(values: string[], value: string): string[] {
  return value && !values.includes(value) ? [...values, value] : [...values];
}

export function buildQuestionRefreshBody(input: QuestionRefreshInput): QuestionRefreshInput {
  return {
    ...input,
    generationState: {
      ...input.generationState,
      seen_answers: appendUnique(input.generationState.seen_answers, input.currentAnswer),
      seen_clues: appendUnique(input.generationState.seen_clues, input.currentClue),
    },
  };
}
