// Host → All players
export const DAY_HOST_EVENTS = {
  PHASE_CHANGE: "td_phase_change",
  PLAYERS_UPDATE: "td_players_update",
  TIMER_START: "td_timer_start",
  TIMER_STOP: "td_timer_stop",
  MISSION_ASSIGNED: "td_mission_assigned",
  EVENT_START: "td_event_start",
  EVENT_END: "td_event_end",
  ROUNDTABLE_START: "td_roundtable_start",
  VOTING_START: "td_voting_start",
  VOTE_RESULT: "td_vote_result",
  ENDGAME: "td_endgame",
  PLAYER_KICKED: "td_player_kicked",
} as const;

// Player → Host
export const DAY_PLAYER_EVENTS = {
  PLAYER_READY: "td_player_ready",
  MISSION_COMPLETED: "td_mission_completed",
  VOTE_SUBMITTED: "td_vote_submitted",
  ROLE_CONFIRMED: "td_role_confirmed",
} as const;

export function getDayChannelName(sessionId: string): string {
  return `day-of-deception:${sessionId}`;
}
