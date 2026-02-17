import type { GamePhase } from "./types";

/** Map of valid transitions: from → set of allowed targets */
const VALID_TRANSITIONS: Record<GamePhase, GamePhase[]> = {
  lobby: ["round_intro", "prep"],
  prep: ["board_select", "lobby"],
  round_intro: ["board_select"],
  board_select: ["clue_display", "daily_double_wager", "final_category", "game_over", "round_intro"],
  clue_display: ["buzzer_open"],
  buzzer_open: ["answer_check", "board_select"],
  answer_check: ["buzzer_open", "board_select"],
  daily_double_wager: ["daily_double_answer"],
  daily_double_answer: ["board_select"],
  final_category: ["final_wager"],
  final_wager: ["final_clue"],
  final_clue: ["final_draw"],
  final_draw: ["final_locked"],
  final_locked: ["final_reveal"],
  final_reveal: ["final_reveal", "game_over"],
  game_over: ["lobby"],
};

export function canTransition(from: GamePhase, to: GamePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getValidTransitions(from: GamePhase): GamePhase[] {
  return VALID_TRANSITIONS[from] ?? [];
}
