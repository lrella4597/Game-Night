"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface DayHostMissionPanelProps {
  sessionId: string;
  onSendMission: (playerId?: string) => Promise<void>;
}

interface Mission {
  id: string;
  playerName: string;
  missionText: string;
  category: string;
  completed: boolean;
  createdAt: string;
}

export default function DayHostMissionPanel({
  sessionId,
  onSendMission,
}: DayHostMissionPanelProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("traitors_day_missions")
        .select(
          "id, player_id, mission_text, mission_category, is_completed, created_at, traitors_day_players(display_name)"
        )
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch missions:", error);
        return;
      }

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setMissions(
          (data as any[]).map((row) => {
            const player = Array.isArray(row.traitors_day_players)
              ? row.traitors_day_players[0]
              : row.traitors_day_players;
            return {
              id: row.id,
              playerName: player?.display_name ?? "Unknown",
              missionText: row.mission_text,
              category: row.mission_category ?? "General",
              completed: row.is_completed,
              createdAt: row.created_at,
            };
          })
        );
      }
    } catch (err) {
      console.error("Failed to fetch missions:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  async function handleSendMission() {
    setSending(true);
    try {
      await onSendMission();
      // Refresh missions after sending
      await fetchMissions();
    } finally {
      setSending(false);
    }
  }

  const completedCount = missions.filter((m) => m.completed).length;
  const pendingCount = missions.filter((m) => !m.completed).length;

  return (
    <div className="bg-white/5 rounded-xl border border-green-900/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
          Missions
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-400">
            {completedCount} completed
          </span>
          <span className="text-yellow-400">
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* Send Mission Button */}
      <button
        onClick={handleSendMission}
        disabled={sending}
        className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm mb-4"
      >
        {sending ? "Sending..." : "Send New Mission (Auto-Assign)"}
      </button>

      {/* Mission List */}
      {loading && missions.length === 0 ? (
        <p className="text-white/40 text-sm">Loading missions...</p>
      ) : missions.length === 0 ? (
        <p className="text-white/40 text-sm italic">
          No missions sent yet. Send a mission to a deceiver above.
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {missions.map((mission) => (
            <div
              key={mission.id}
              className={`rounded-lg p-3 border ${
                mission.completed
                  ? "bg-green-600/5 border-green-900/30"
                  : "bg-yellow-600/5 border-yellow-900/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className="shrink-0 mt-0.5">
                  {mission.completed ? (
                    <svg
                      className="w-5 h-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>

                {/* Mission Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium">
                      {mission.playerName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs bg-white/10 text-white/50">
                      {mission.category}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    {mission.missionText}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
