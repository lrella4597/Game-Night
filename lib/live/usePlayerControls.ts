"use client";

import { useCallback } from "react";
import { PLAYER_EVENTS } from "./channelEvents";

interface UsePlayerControlsOptions {
  playerId: string;
  sessionId: string;
  broadcast: (event: string, payload: unknown) => void;
}

export function usePlayerControls({ playerId, sessionId, broadcast }: UsePlayerControlsOptions) {
  const buzz = useCallback(() => {
    broadcast(PLAYER_EVENTS.BUZZ, {
      playerId,
      timestamp: Date.now(),
    });
  }, [playerId, broadcast]);

  const submitFinalWager = useCallback(
    async (wager: number) => {
      // Save to DB via API route (reliable)
      try {
        const res = await fetch("/api/live/submit-wager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, sessionId, wager }),
        });
        if (!res.ok) {
          console.error("Failed to save wager via API:", await res.text());
        }
      } catch (err) {
        console.error("Wager API error:", err);
      }
      // Broadcast status notification to host
      broadcast(PLAYER_EVENTS.FINAL_WAGER, { playerId, wager });
    },
    [playerId, sessionId, broadcast]
  );

  const submitFinalDrawing = useCallback(
    async (drawingDataUrl: string, textAnswer?: string) => {
      // Save to DB via API route (reliable, avoids broadcast size limits)
      try {
        const res = await fetch("/api/live/submit-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, sessionId, drawingDataUrl, textAnswer }),
        });
        if (!res.ok) {
          console.error("Failed to save answer via API:", await res.text());
        }
      } catch (err) {
        console.error("Answer API error:", err);
      }
      // Broadcast status notification (small payload, no drawing data)
      broadcast(PLAYER_EVENTS.FINAL_DRAWING, { playerId, submitted: true });
    },
    [playerId, sessionId, broadcast]
  );

  const submitDailyDoubleWager = useCallback(
    (wager: number) => {
      broadcast(PLAYER_EVENTS.DD_WAGER, { playerId, wager });
    },
    [playerId, broadcast]
  );

  return { buzz, submitFinalWager, submitFinalDrawing, submitDailyDoubleWager };
}
