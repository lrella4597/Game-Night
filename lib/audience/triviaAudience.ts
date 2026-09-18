import type { BoardState, Category, Question } from "@/app/data/boardData";
import type { Team } from "@/app/data/teams";

export const TRIVIA_AUDIENCE_CHANNEL = "trivia-free-for-all-audience-v1";
export const TRIVIA_AUDIENCE_STORAGE_KEY = "trivia-free-for-all.audience.snapshot.v1";

export interface AudienceBoardQuestion {
  id: string;
  value: number;
}

export interface AudienceBoardColumn {
  id: string;
  title: string;
  questions: AudienceBoardQuestion[];
}

export interface AudienceActiveClue {
  id: string;
  categoryTitle: string;
  value: number;
  clue: string;
}

export interface AudienceTeam {
  id: string;
  name: string;
  color: string;
  score: number;
}

export interface TriviaAudienceSnapshot {
  board: {
    rowValues: number[];
    columns: AudienceBoardColumn[];
  };
  usedQuestionIds: string[];
  activeClue: AudienceActiveClue | null;
  teams: AudienceTeam[];
}

interface ActiveQuestion {
  question: Question;
  category: Category;
}

interface CreateAudienceSnapshotInput {
  board: BoardState;
  usedQuestionIds: Set<string>;
  activeQuestion: ActiveQuestion | null;
  teams: Team[];
}

export function refreshActiveAudienceQuestion(
  activeQuestion: ActiveQuestion | null,
  questionId: string,
  question: string,
  answer: string
): ActiveQuestion | null {
  if (!activeQuestion || activeQuestion.question.id !== questionId) return activeQuestion;

  return {
    ...activeQuestion,
    question: {
      ...activeQuestion.question,
      question,
      answer,
    },
  };
}

export function createAudienceSnapshot({
  board,
  usedQuestionIds,
  activeQuestion,
  teams,
}: CreateAudienceSnapshotInput): TriviaAudienceSnapshot {
  return {
    board: {
      rowValues: [...board.rowValues],
      columns: board.columns.map((column) => ({
        id: column.id,
        title: column.title,
        questions: column.questions.map((question) => ({
          id: question.id,
          value: question.value,
        })),
      })),
    },
    usedQuestionIds: [...usedQuestionIds],
    activeClue: activeQuestion
      ? {
          id: activeQuestion.question.id,
          categoryTitle: activeQuestion.category.title,
          value: activeQuestion.question.value,
          clue: activeQuestion.question.question,
        }
      : null,
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      score: team.score,
    })),
  };
}

export function publishAudienceSnapshot(snapshot: TriviaAudienceSnapshot): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(TRIVIA_AUDIENCE_STORAGE_KEY, JSON.stringify(snapshot));
  if (typeof BroadcastChannel === "undefined") return;

  const channel = new BroadcastChannel(TRIVIA_AUDIENCE_CHANNEL);
  channel.postMessage({ type: "snapshot", snapshot });
  channel.close();
}

export function readAudienceSnapshot(): TriviaAudienceSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TRIVIA_AUDIENCE_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TriviaAudienceSnapshot) : null;
  } catch {
    return null;
  }
}
