// Host → All players
export const HOST_EVENTS = {
  STATE_UPDATE: "state_update",
  PHASE_CHANGE: "phase_change",
  BUZZER_OPEN: "buzzer_open",
  BUZZER_LOCK: "buzzer_lock",
  TIMER_START: "timer_start",
  TIMER_PAUSE: "timer_pause",
  TIMER_RESUME: "timer_resume",
  SCORE_UPDATE: "score_update",
  PLAYER_KICKED: "player_kicked",
  CLUE_SELECT: "clue_select",
  ANSWER_RESULT: "answer_result",
  FINAL_REVEAL_NEXT: "final_reveal_next",
  GAME_OVER: "game_over",
  PLAYERS_UPDATE: "players_update",
  DAILY_DOUBLE: "daily_double",
  ROUND_TRANSITION: "round_transition",
} as const;

// Player → Host
export const PLAYER_EVENTS = {
  BUZZ: "buzz",
  FINAL_WAGER: "final_wager",
  FINAL_DRAWING: "final_drawing",
  PLAYER_READY: "player_ready",
  DD_WAGER: "dd_wager",
} as const;

// Companion → Host (companion sends commands; host page executes them)
export const COMPANION_EVENTS = {
  OPEN_BUZZER: "companion_open_buzzer",
  JUDGE_CORRECT: "companion_judge_correct",
  JUDGE_INCORRECT: "companion_judge_incorrect",
  SKIP_CLUE: "companion_skip_clue",
  DD_SHOW_CLUE: "companion_dd_show_clue",
  DD_CORRECT: "companion_dd_correct",
  DD_INCORRECT: "companion_dd_incorrect",
} as const;

export function getChannelName(sessionId: string): string {
  return `live-game:${sessionId}`;
}
