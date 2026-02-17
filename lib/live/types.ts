import type { BoardState } from "@/app/data/boardData";

// ── Game Phases ──────────────────────────────────────────────────────────────

export type GamePhase =
  | "lobby"
  | "prep"
  | "round_intro"
  | "board_select"
  | "clue_display"
  | "buzzer_open"
  | "answer_check"
  | "daily_double_wager"
  | "daily_double_answer"
  | "final_category"
  | "final_wager"
  | "final_clue"
  | "final_draw"
  | "final_locked"
  | "final_reveal"
  | "game_over";

export type SessionStatus = "lobby" | "active" | "paused" | "finished" | "cancelled";

// ── Session ──────────────────────────────────────────────────────────────────

export interface LiveSessionConfig {
  enableDoubleJeopardy: boolean;
  buzzerLockoutMs: number;
  clueTimerSeconds: number;
  finalTimerSeconds: number;
  wagerTimerSeconds: number;
  maxPlayers: number;
}

export const DEFAULT_SESSION_CONFIG: LiveSessionConfig = {
  enableDoubleJeopardy: false,
  buzzerLockoutMs: 250,
  clueTimerSeconds: 30,
  finalTimerSeconds: 30,
  wagerTimerSeconds: 60,
  maxPlayers: 12,
};

export interface LiveSession {
  id: string;
  hostId: string;
  joinCode: string;
  status: SessionStatus;
  boardData: BoardState | null;
  doubleJeopardyBoard: BoardState | null;
  finalJeopardy: FinalJeopardyData | null;
  config: LiveSessionConfig;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// ── Player ───────────────────────────────────────────────────────────────────

export const PLAYER_COLORS = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#e11d48", // rose
  "#8b5cf6", // violet
];

export interface LivePlayer {
  id: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
  score: number;
  isConnected: boolean;
  finalWager: number | null;
  finalAnswerDrawing: string | null;
  finalAnswerText: string | null;
  finalCorrect: boolean | null;
  correctCount: number;
  incorrectCount: number;
  buzzCount: number;
  joinedAt: string;
}

// ── Game State ───────────────────────────────────────────────────────────────

export interface BuzzerEntry {
  playerId: string;
  timestamp: number;
}

export interface DailyDoubleLocation {
  catIdx: number;
  clueIdx: number;
}

export interface LiveGameState {
  sessionId: string;
  phase: GamePhase;
  currentRound: number;
  currentCategoryIndex: number | null;
  currentClueIndex: number | null;
  currentClueValue: number | null;
  cluesRevealed: string[];
  dailyDoubles: DailyDoubleLocation[];
  buzzerQueue: BuzzerEntry[];
  currentAnswererId: string | null;
  buzzerLocked: boolean;
  timerStartedAt: string | null;
  timerDurationSeconds: number | null;
  timerPausedAt: string | null;
  finalRevealIndex: number;
  finalRevealOrder: string[];
  lastAction: string | null;
  updatedAt: string;
}

// ── Final Jeopardy ──────────────────────────────────────────────────────────

export interface FinalJeopardyData {
  category: string;
  clue: string;
  answer: string;
}

// ── Realtime Channel Events ─────────────────────────────────────────────────

export type HostEvent =
  | { type: "STATE_UPDATE"; payload: Partial<LiveGameState> }
  | { type: "PHASE_CHANGE"; payload: { phase: GamePhase; data?: Record<string, unknown> } }
  | { type: "BUZZER_OPEN" }
  | { type: "BUZZER_LOCK" }
  | { type: "TIMER_START"; payload: { durationSeconds: number } }
  | { type: "TIMER_PAUSE" }
  | { type: "TIMER_RESUME" }
  | { type: "SCORE_UPDATE"; payload: { playerId: string; newScore: number; delta: number } }
  | { type: "PLAYER_KICKED"; payload: { playerId: string } }
  | { type: "CLUE_SELECT"; payload: { catIdx: number; clueIdx: number; value: number } }
  | { type: "ANSWER_RESULT"; payload: { playerId: string; correct: boolean; delta: number } }
  | { type: "FINAL_REVEAL_NEXT" }
  | { type: "GAME_OVER" };

export type PlayerEvent =
  | { type: "BUZZ"; payload: { playerId: string; timestamp: number } }
  | { type: "FINAL_WAGER"; payload: { playerId: string; wager: number } }
  | { type: "FINAL_DRAWING"; payload: { playerId: string; drawingDataUrl: string; textAnswer?: string } }
  | { type: "PLAYER_READY"; payload: { playerId: string } };

// ── API Request/Response Types ──────────────────────────────────────────────

export interface CreateSessionRequest {
  config?: Partial<LiveSessionConfig>;
  boardData?: import("@/app/data/boardData").BoardState;
}

export interface CreateSessionResponse {
  sessionId: string;
  joinCode: string;
}

export interface JoinSessionRequest {
  joinCode: string;
  displayName: string;
}

export interface JoinSessionResponse {
  sessionId: string;
  playerId: string;
  playerToken: string;
}

// ── Database Row Types (snake_case) ─────────────────────────────────────────

export interface LiveSessionRow {
  id: string;
  host_id: string;
  join_code: string;
  status: SessionStatus;
  board_data: BoardState | null;
  double_jeopardy_board: BoardState | null;
  final_jeopardy: FinalJeopardyData | null;
  enable_double_jeopardy: boolean;
  buzzer_lockout_ms: number;
  clue_timer_seconds: number;
  final_timer_seconds: number;
  wager_timer_seconds: number;
  max_players: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface LivePlayerRow {
  id: string;
  session_id: string;
  display_name: string;
  avatar_color: string;
  score: number;
  is_connected: boolean;
  final_wager: number | null;
  final_answer_drawing: string | null;
  final_answer_text: string | null;
  final_correct: boolean | null;
  correct_count: number;
  incorrect_count: number;
  buzz_count: number;
  joined_at: string;
  last_seen_at: string;
}

export interface LiveGameStateRow {
  session_id: string;
  phase: GamePhase;
  current_round: number;
  current_category_index: number | null;
  current_clue_index: number | null;
  current_clue_value: number | null;
  clues_revealed: string[];
  daily_doubles: DailyDoubleLocation[];
  buzzer_queue: BuzzerEntry[];
  current_answerer_id: string | null;
  buzzer_locked: boolean;
  timer_started_at: string | null;
  timer_duration_seconds: number | null;
  timer_paused_at: string | null;
  final_reveal_index: number;
  final_reveal_order: string[];
  last_action: string | null;
  updated_at: string;
}

// ── Converters ──────────────────────────────────────────────────────────────

export function sessionFromRow(row: LiveSessionRow): LiveSession {
  return {
    id: row.id,
    hostId: row.host_id,
    joinCode: row.join_code,
    status: row.status,
    boardData: row.board_data,
    doubleJeopardyBoard: row.double_jeopardy_board,
    finalJeopardy: row.final_jeopardy,
    config: {
      enableDoubleJeopardy: row.enable_double_jeopardy,
      buzzerLockoutMs: row.buzzer_lockout_ms,
      clueTimerSeconds: row.clue_timer_seconds,
      finalTimerSeconds: row.final_timer_seconds,
      wagerTimerSeconds: row.wager_timer_seconds,
      maxPlayers: row.max_players,
    },
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function playerFromRow(row: LivePlayerRow): LivePlayer {
  return {
    id: row.id,
    sessionId: row.session_id,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    score: row.score,
    isConnected: row.is_connected,
    finalWager: row.final_wager,
    finalAnswerDrawing: row.final_answer_drawing,
    finalAnswerText: row.final_answer_text,
    finalCorrect: row.final_correct,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    buzzCount: row.buzz_count,
    joinedAt: row.joined_at,
  };
}

export function gameStateFromRow(row: LiveGameStateRow): LiveGameState {
  return {
    sessionId: row.session_id,
    phase: row.phase,
    currentRound: row.current_round,
    currentCategoryIndex: row.current_category_index,
    currentClueIndex: row.current_clue_index,
    currentClueValue: row.current_clue_value,
    cluesRevealed: row.clues_revealed,
    dailyDoubles: row.daily_doubles,
    buzzerQueue: row.buzzer_queue,
    currentAnswererId: row.current_answerer_id,
    buzzerLocked: row.buzzer_locked,
    timerStartedAt: row.timer_started_at,
    timerDurationSeconds: row.timer_duration_seconds,
    timerPausedAt: row.timer_paused_at,
    finalRevealIndex: row.final_reveal_index,
    finalRevealOrder: row.final_reveal_order,
    lastAction: row.last_action,
    updatedAt: row.updated_at,
  };
}
