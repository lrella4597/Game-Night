"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import CustomizeTodayChat from "./CustomizeTodayChat";
import PackEditor from "./PackEditor";
import type { MissionPackItem, EventPackItem, ContextSummary } from "@/lib/chat/types";

interface DayHostLobbyProps {
  sessionId: string;
  players: {
    id: string;
    displayName: string;
    avatarColor: string;
    isConnected: boolean;
  }[];
  joinCode: string;
  config: {
    deceiverCount: number;
    missionCadence: string;
    numberOfEvents: number;
    discussionTimerMinutes: number;
    votingTimerSeconds: number;
    maxTokenVoteBonus: number;
    maxPlayers: number;
  };
  onStartGame: () => Promise<void>;
  onKickPlayer: (playerId: string) => Promise<void>;
}

export default function DayHostLobby({
  sessionId,
  players,
  joinCode,
  config,
  onStartGame,
  onKickPlayer,
}: DayHostLobbyProps) {
  const [starting, setStarting] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [missionPack, setMissionPack] = useState<MissionPackItem[] | null>(null);
  const [eventPack, setEventPack] = useState<EventPackItem[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [packApplied, setPackApplied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    if (isLocal) {
      fetch("/api/live/network-ip")
        .then((r) => r.json())
        .then((data) => {
          if (data.ip) {
            const port = window.location.port;
            setJoinUrl(
              `http://${data.ip}:${port}/day-of-deception/play?code=${joinCode}`
            );
          } else {
            setJoinUrl(
              `${window.location.origin}/day-of-deception/play?code=${joinCode}`
            );
          }
        })
        .catch(() =>
          setJoinUrl(
            `${window.location.origin}/day-of-deception/play?code=${joinCode}`
          )
        );
    } else {
      setJoinUrl(
        `${window.location.origin}/day-of-deception/play?code=${joinCode}`
      );
    }
  }, [joinCode]);

  async function handleStart() {
    setStarting(true);
    try {
      await onStartGame();
    } catch {
      setStarting(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canStart = players.length >= 1;

  const configLabels: { key: keyof typeof config; label: string }[] = [
    { key: "deceiverCount", label: "Deceiver Count" },
    { key: "missionCadence", label: "Mission Cadence" },
    { key: "numberOfEvents", label: "Number of Events" },
    { key: "discussionTimerMinutes", label: "Discussion Timer (min)" },
    { key: "votingTimerSeconds", label: "Voting Timer (sec)" },
    { key: "maxTokenVoteBonus", label: "Max Token Vote Bonus" },
    { key: "maxPlayers", label: "Max Players" },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-green-400">Host Lobby</h2>
        <div className="text-white/60 text-sm">
          Players: {players.length}/{config.maxPlayers}
        </div>
      </div>

      {/* Join Code + QR */}
      <div className="flex flex-col items-center gap-6 mb-10">
        {joinUrl && (
          <div className="bg-white rounded-xl p-3">
            <QRCodeSVG
              value={joinUrl}
              size={180}
              fgColor="#166534"
              bgColor="#ffffff"
              level="M"
            />
          </div>
        )}

        <div className="text-center">
          <p className="text-green-400 text-sm uppercase tracking-wider mb-2">
            Join Code
          </p>
          <button
            onClick={handleCopyCode}
            className="group relative text-5xl font-mono font-bold text-green-500 tracking-[0.3em] hover:text-green-400 transition-colors cursor-pointer"
            title="Click to copy"
          >
            {joinCode}
            <span className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              {copied ? (
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-white/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              )}
            </span>
          </button>
          {copied && (
            <p className="text-green-400 text-xs mt-1">Copied!</p>
          )}
        </div>

        {joinUrl && (
          <p className="text-xs text-green-400/40">{joinUrl}</p>
        )}
      </div>

      {/* Two-column: Players + Config */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Player Roster */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Players ({players.length}/{config.maxPlayers})
          </h3>

          {players.length === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-xl border border-green-900/30">
              <p className="text-green-300">Waiting for players to join...</p>
              <p className="text-white/60 text-sm mt-1">
                Share the code or QR above
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-green-900/30"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: player.avatarColor }}
                  />
                  <span className="text-white text-sm font-medium truncate flex-1">
                    {player.displayName}
                  </span>
                  {!player.isConnected && (
                    <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
                  )}
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={`Kick ${player.displayName}`}
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config Section */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Game Settings
          </h3>
          <div className="bg-white/5 rounded-xl border border-green-900/30 p-4 space-y-3">
            {configLabels.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between py-1"
              >
                <span className="text-white/60 text-sm">{label}</span>
                <span className="text-white text-sm font-medium">
                  {String(config[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customize Today Section */}
      {showCustomize && !missionPack && (
        <div className="w-full max-w-5xl mb-8">
          <CustomizeTodayChat
            sessionId={sessionId}
            onPackGenerated={(missions, events) => {
              setMissionPack(missions);
              setEventPack(events);
            }}
            onClose={() => setShowCustomize(false)}
          />
        </div>
      )}

      {missionPack && eventPack && (
        <div className="w-full max-w-5xl mb-8">
          <PackEditor
            missionPack={missionPack}
            eventPack={eventPack}
            onMissionPackChange={setMissionPack}
            onEventPackChange={setEventPack}
            onApply={async () => {
              setApplying(true);
              try {
                const res = await fetch("/api/day-of-deception/save-pack", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId, missionPack, eventPack, contextSummary: { theme: "", setting: "", conversationHistory: "" } }),
                });
                if (res.ok) setPackApplied(true);
              } finally {
                setApplying(false);
              }
            }}
            applying={applying}
          />
        </div>
      )}

      {/* Start Game Button */}
      <div className="flex flex-col items-center gap-3">
        {!showCustomize && !missionPack && (
          <button
            onClick={() => setShowCustomize(true)}
            className="mb-2 bg-white/10 hover:bg-white/20 text-green-400 font-semibold py-3 px-6 rounded-xl transition-all border border-green-900/30"
          >
            Customize Today (Optional)
          </button>
        )}

        {packApplied && (
          <p className="text-green-400 text-sm mb-2">Custom pack applied!</p>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart || starting}
          className="bg-green-600 hover:bg-green-500 text-white font-bold text-xl py-4 px-8 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg"
        >
          {starting ? "Starting..." : "Start Game"}
        </button>
        {!canStart && (
          <p className="text-green-400 text-sm">
            Need at least 1 player to start
          </p>
        )}
      </div>
    </div>
  );
}
