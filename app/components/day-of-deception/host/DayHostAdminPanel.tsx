"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface DayHostAdminPanelProps {
  sessionId: string;
  visible: boolean;
}

interface PlayerRoleInfo {
  id: string;
  displayName: string;
  role: string;
  shadowTokens: number;
}

export default function DayHostAdminPanel({
  sessionId,
  visible,
}: DayHostAdminPanelProps) {
  const [playerRoles, setPlayerRoles] = useState<PlayerRoleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!visible) return;

    async function fetchRoles() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("traitors_day_players")
          .select("id, display_name, role, shadow_tokens")
          .eq("session_id", sessionId);

        if (error) {
          console.error("Failed to fetch player roles:", error);
          return;
        }

        if (data) {
          setPlayerRoles(
            data.map(
              (row: {
                id: string;
                display_name: string;
                role: string | null;
                shadow_tokens: number;
              }) => ({
                id: row.id,
                displayName: row.display_name,
                role: row.role || "unknown",
                shadowTokens: row.shadow_tokens ?? 0,
              })
            )
          );
        }
      } catch (err) {
        console.error("Failed to fetch player roles:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRoles();
  }, [visible, sessionId]);

  if (!visible) return null;

  const traitors = playerRoles.filter((p) => p.role === "traitor");
  const faithful = playerRoles.filter((p) => p.role === "faithful");

  return (
    <div className="bg-white/5 rounded-xl border border-green-900/30 p-4">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          Admin Panel - Player Roles
        </h3>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${
            collapsed ? "" : "rotate-180"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-4">
          {loading ? (
            <p className="text-white/40 text-sm">Loading roles...</p>
          ) : playerRoles.length === 0 ? (
            <p className="text-white/40 text-sm">
              No player roles assigned yet.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Deceivers */}
              {traitors.length > 0 && (
                <div>
                  <p className="text-red-400 text-xs uppercase tracking-wider font-semibold mb-2">
                    Deceivers ({traitors.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {traitors.map((player) => (
                      <div
                        key={player.id}
                        className="bg-white/5 rounded-lg p-3 flex flex-col gap-1 border border-red-900/30"
                      >
                        <span className="text-sm font-medium text-white truncate">
                          {player.displayName}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-red-600/30 text-red-400 border border-red-500/50">
                            Deceiver
                          </span>
                          <span className="text-white/40 text-xs">
                            {player.shadowTokens} tokens
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loyal */}
              {faithful.length > 0 && (
                <div>
                  <p className="text-green-400 text-xs uppercase tracking-wider font-semibold mb-2">
                    Loyal ({faithful.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {faithful.map((player) => (
                      <div
                        key={player.id}
                        className="bg-white/5 rounded-lg p-3 flex flex-col gap-1 border border-green-900/30"
                      >
                        <span className="text-sm font-medium text-white truncate">
                          {player.displayName}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase bg-green-600/30 text-green-400 border border-green-500/50">
                            Loyal
                          </span>
                          <span className="text-white/40 text-xs">
                            {player.shadowTokens} tokens
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
