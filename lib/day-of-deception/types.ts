import { PLAYER_COLORS } from "@/lib/live/types";
import type { MissionPackItem, EventPackItem, ContextSummary } from "@/lib/chat/types";

export { PLAYER_COLORS };
export type { MissionPackItem, EventPackItem, ContextSummary };

// ── Game Phases ──────────────────────────────────────────────────────────────

export type DayPhase =
  | "lobby"
  | "roles_revealed"
  | "freeplay"
  | "event_active"
  | "roundtable"
  | "voting"
  | "reveal"
  | "end";

export type DaySessionStatus = "lobby" | "active" | "finished" | "cancelled";

export type PlayerRole = "traitor" | "faithful";

// Display names for UI (DB values stay as traitor/faithful)
export const ROLE_DISPLAY: Record<string, string> = { traitor: "Deceiver", faithful: "Loyal" };
export const ROLE_DISPLAY_UPPER: Record<string, string> = { traitor: "DECEIVER", faithful: "LOYAL" };
export const WINNER_DISPLAY: Record<string, string> = { faithful: "Loyal", traitors: "Deceivers" };

// ── Session Config ───────────────────────────────────────────────────────────

export interface DaySessionConfig {
  deceiverCount: number;
  missionCadence: "manual" | "30" | "45" | "60";
  numberOfEvents: number;
  discussionTimerMinutes: number;
  votingTimerSeconds: number;
  revealRolesAtEnd: boolean;
  showAdminRolePanel: boolean;
  maxTokenVoteBonus: number;
  maxPlayers: number;
}

export const DEFAULT_DAY_CONFIG: DaySessionConfig = {
  deceiverCount: 2,
  missionCadence: "manual",
  numberOfEvents: 2,
  discussionTimerMinutes: 10,
  votingTimerSeconds: 120,
  revealRolesAtEnd: true,
  showAdminRolePanel: false,
  maxTokenVoteBonus: 3,
  maxPlayers: 30,
};

// ── Session ──────────────────────────────────────────────────────────────────

export interface DaySession {
  id: string;
  hostId: string;
  joinCode: string;
  status: DaySessionStatus;
  config: DaySessionConfig;
  missionPack: MissionPackItem[] | null;
  eventPack: EventPackItem[] | null;
  contextSummary: ContextSummary | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

// ── Player ───────────────────────────────────────────────────────────────────

export interface DayPlayer {
  id: string;
  sessionId: string;
  displayName: string;
  avatarColor: string;
  isConnected: boolean;
  shadowTokens: number;
  joinedAt: string;
}

export interface DayPlayerWithRole extends DayPlayer {
  role: PlayerRole;
}

// ── Mission ──────────────────────────────────────────────────────────────────

export interface DayMission {
  id: string;
  sessionId: string;
  playerId: string;
  missionText: string;
  missionCategory: string;
  isCompleted: boolean;
  completedProof: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Game State ───────────────────────────────────────────────────────────────

export interface DayGameState {
  sessionId: string;
  phase: DayPhase;
  currentEventIndex: number;
  currentEventTemplate: string | null;
  eventStartedAt: string | null;
  eventDurationSeconds: number | null;
  missionsSentCount: number;
  voteTally: Record<string, { name: string; votes: number; weightedVotes: number }> | null;
  accusedPlayerId: string | null;
  winner: "faithful" | "traitors" | null;
  rolesRevealed: boolean;
  timerStartedAt: string | null;
  timerDurationSeconds: number | null;
  lastAction: string | null;
  updatedAt: string;
}

// ── API Request Types ────────────────────────────────────────────────────────

export interface CreateDayRequest {
  config?: Partial<DaySessionConfig>;
}

export interface JoinDayRequest {
  joinCode: string;
  displayName: string;
}

// ── Database Row Types (snake_case) ──────────────────────────────────────────

export interface DaySessionRow {
  id: string;
  host_id: string;
  join_code: string;
  status: string;
  traitor_count: number;
  mission_cadence: string;
  number_of_events: number;
  discussion_timer_minutes: number;
  voting_timer_seconds: number;
  reveal_roles_at_end: boolean;
  show_admin_role_panel: boolean;
  max_token_vote_bonus: number;
  max_players: number;
  mission_pack: MissionPackItem[] | null;
  event_pack: EventPackItem[] | null;
  context_summary: ContextSummary | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface DayPlayerRow {
  id: string;
  session_id: string;
  display_name: string;
  avatar_color: string;
  is_connected: boolean;
  role: string | null;
  shadow_tokens: number;
  vote_target_id: string | null;
  vote_locked: boolean;
  joined_at: string;
  last_seen_at: string;
}

export interface DayGameStateRow {
  session_id: string;
  phase: string;
  current_event_index: number;
  current_event_template: string | null;
  event_started_at: string | null;
  event_duration_seconds: number | null;
  missions_sent_count: number;
  vote_tally: Record<string, { name: string; votes: number; weightedVotes: number }> | null;
  accused_player_id: string | null;
  winner: string | null;
  roles_revealed: boolean;
  timer_started_at: string | null;
  timer_duration_seconds: number | null;
  last_action: string | null;
  updated_at: string;
}

export interface DayMissionRow {
  id: string;
  session_id: string;
  player_id: string;
  mission_text: string;
  mission_category: string;
  is_completed: boolean;
  completed_proof: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Converters ───────────────────────────────────────────────────────────────

export function daySessionFromRow(row: DaySessionRow): DaySession {
  return {
    id: row.id,
    hostId: row.host_id,
    joinCode: row.join_code,
    status: row.status as DaySessionStatus,
    config: {
      deceiverCount: row.traitor_count,
      missionCadence: row.mission_cadence as DaySessionConfig["missionCadence"],
      numberOfEvents: row.number_of_events,
      discussionTimerMinutes: row.discussion_timer_minutes,
      votingTimerSeconds: row.voting_timer_seconds,
      revealRolesAtEnd: row.reveal_roles_at_end,
      showAdminRolePanel: row.show_admin_role_panel,
      maxTokenVoteBonus: row.max_token_vote_bonus,
      maxPlayers: row.max_players,
    },
    missionPack: row.mission_pack ?? null,
    eventPack: row.event_pack ?? null,
    contextSummary: row.context_summary ?? null,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function dayPlayerFromRow(row: DayPlayerRow): DayPlayer {
  return {
    id: row.id,
    sessionId: row.session_id,
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    isConnected: row.is_connected,
    shadowTokens: row.shadow_tokens,
    joinedAt: row.joined_at,
  };
}

export function dayPlayerWithRoleFromRow(row: DayPlayerRow): DayPlayerWithRole {
  return {
    ...dayPlayerFromRow(row),
    role: row.role as PlayerRole,
  };
}

export function dayGameStateFromRow(row: DayGameStateRow): DayGameState {
  return {
    sessionId: row.session_id,
    phase: row.phase as DayPhase,
    currentEventIndex: row.current_event_index,
    currentEventTemplate: row.current_event_template,
    eventStartedAt: row.event_started_at,
    eventDurationSeconds: row.event_duration_seconds,
    missionsSentCount: row.missions_sent_count,
    voteTally: row.vote_tally,
    accusedPlayerId: row.accused_player_id,
    winner: row.winner as "faithful" | "traitors" | null,
    rolesRevealed: row.roles_revealed,
    timerStartedAt: row.timer_started_at,
    timerDurationSeconds: row.timer_duration_seconds,
    lastAction: row.last_action,
    updatedAt: row.updated_at,
  };
}

export function dayMissionFromRow(row: DayMissionRow): DayMission {
  return {
    id: row.id,
    sessionId: row.session_id,
    playerId: row.player_id,
    missionText: row.mission_text,
    missionCategory: row.mission_category,
    isCompleted: row.is_completed,
    completedProof: row.completed_proof,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}
