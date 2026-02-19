"use client";

import { useCallback } from "react";
import { DAY_PLAYER_EVENTS } from "./channelEvents";
import type { PlayerRole, DayMission } from "./types";

interface UseDayPlayerControlsOptions {
  sessionId: string;
  playerId: string;
  playerToken: string;
  broadcast: (event: string, payload: unknown) => void;
}

interface MyRoleResponse {
  role: PlayerRole;
  deceivers?: { id: string; displayName: string }[];
}

export function useDayPlayerControls({
  sessionId,
  playerId,
  playerToken,
  broadcast,
}: UseDayPlayerControlsOptions) {
  const fetchMyRole = useCallback(async (): Promise<MyRoleResponse> => {
    const params = new URLSearchParams({
      sessionId,
      playerId,
      token: playerToken,
    });
    const res = await fetch(`/api/day-of-deception/my-role?${params}`);
    if (!res.ok) throw new Error("Failed to fetch role");
    return res.json();
  }, [sessionId, playerId, playerToken]);

  const fetchMyMissions = useCallback(async (): Promise<DayMission[]> => {
    const params = new URLSearchParams({
      sessionId,
      playerId,
      token: playerToken,
    });
    const res = await fetch(`/api/day-of-deception/my-missions?${params}`);
    if (!res.ok) throw new Error("Failed to fetch missions");
    const data = await res.json();
    return data.missions;
  }, [sessionId, playerId, playerToken]);

  const completeMission = useCallback(
    async (missionId: string, proof?: string) => {
      const res = await fetch("/api/day-of-deception/complete-mission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId, token: playerToken, missionId, proof }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete mission");
      }
      broadcast(DAY_PLAYER_EVENTS.MISSION_COMPLETED, { playerId, missionId });
      return res.json();
    },
    [sessionId, playerId, playerToken, broadcast]
  );

  const submitVote = useCallback(
    async (targetId: string) => {
      const res = await fetch("/api/day-of-deception/submit-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId, token: playerToken, targetId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit vote");
      }
      broadcast(DAY_PLAYER_EVENTS.VOTE_SUBMITTED, { playerId });
      return res.json();
    },
    [sessionId, playerId, playerToken, broadcast]
  );

  return { fetchMyRole, fetchMyMissions, completeMission, submitVote };
}
