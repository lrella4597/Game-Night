"use client";

import { useState } from "react";

interface DayHostFreeplayProps {
  players: {
    id: string;
    displayName: string;
    avatarColor: string;
    shadowTokens: number;
  }[];
  onSendMission: (playerId?: string) => Promise<void>;
  onStartEvent: (eventTemplate?: string) => Promise<void>;
  onStartRoundtable: () => Promise<void>;
  missionsSent: number;
  eventsCompleted: number;
  customEventNames?: string[];
}

const DEFAULT_EVENT_TEMPLATES = [
  "Trust Circle",
  "Shadow Trade",
  "Loyalty Test",
  "Sealed Vote",
  "Hidden Agenda",
];

export default function DayHostFreeplay({
  players,
  onSendMission,
  onStartEvent,
  onStartRoundtable,
  missionsSent,
  eventsCompleted,
  customEventNames,
}: DayHostFreeplayProps) {
  const [sendingMission, setSendingMission] = useState(false);
  const [startingEvent, setStartingEvent] = useState(false);
  const [startingRoundtable, setStartingRoundtable] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showPlayerMission, setShowPlayerMission] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSendMission(playerId?: string) {
    setSendingMission(true);
    setActionError(null);
    try {
      await onSendMission(playerId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send mission");
    } finally {
      setSendingMission(false);
      setShowPlayerMission(false);
    }
  }

  async function handleStartEvent(template?: string) {
    setStartingEvent(true);
    setActionError(null);
    try {
      await onStartEvent(template);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start event");
    } finally {
      setStartingEvent(false);
      setShowEventPicker(false);
    }
  }

  async function handleStartRoundtable() {
    setStartingRoundtable(true);
    setActionError(null);
    try {
      await onStartRoundtable();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start roundtable");
      setStartingRoundtable(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen py-8 px-4 bg-[#1a1f14]">
      {/* Header */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-green-400">Day Phase</h2>
        <div className="flex items-center gap-4">
          <div className="bg-white/5 rounded-lg border border-green-900/30 px-3 py-1.5 text-sm">
            <span className="text-white/40">Missions: </span>
            <span className="text-green-400 font-bold">{missionsSent}</span>
          </div>
          <div className="bg-white/5 rounded-lg border border-green-900/30 px-3 py-1.5 text-sm">
            <span className="text-white/40">Events: </span>
            <span className="text-green-400 font-bold">{eventsCompleted}</span>
          </div>
        </div>
      </div>

      {/* Player Grid */}
      <div className="w-full max-w-5xl mb-8">
        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">
          Players ({players.length})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-green-900/30"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: player.avatarColor }}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-white text-sm font-medium truncate">
                  {player.displayName}
                </span>
                <span className="text-white/40 text-xs">
                  {player.shadowTokens} token
                  {player.shadowTokens !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {actionError && (
        <div className="w-full max-w-5xl mb-4 p-3 rounded-lg bg-red-600/20 border border-red-600/40 text-red-300 text-sm">
          {actionError}
        </div>
      )}

      {/* Action Cards */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mission Card */}
        <div className="bg-white/5 rounded-xl border border-green-900/30 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
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
            </div>
            <h3 className="text-lg font-semibold text-white">Missions</h3>
          </div>
          <p className="text-white/40 text-sm mb-4 flex-1">
            Send a secret mission to a deceiver. Auto-assign picks a random
            deceiver, or choose a specific player.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleSendMission()}
              disabled={sendingMission}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {sendingMission ? "Sending..." : "Send Mission (Auto)"}
            </button>
            <button
              onClick={() => setShowPlayerMission(!showPlayerMission)}
              className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-green-900/30"
            >
              Send to Specific Player
            </button>
          </div>

          {/* Player Mission Picker */}
          {showPlayerMission && (
            <div className="mt-3 space-y-1">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSendMission(player.id)}
                  disabled={sendingMission}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-green-600/20 text-white text-sm transition-colors text-left disabled:opacity-30"
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: player.avatarColor }}
                  />
                  {player.displayName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Event Card */}
        <div className="bg-white/5 rounded-xl border border-green-900/30 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
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
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Events</h3>
          </div>
          <p className="text-white/40 text-sm mb-4 flex-1">
            Start a group event. Choose a template or start a random event.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleStartEvent()}
              disabled={startingEvent}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {startingEvent ? "Starting..." : "Start Event (Random)"}
            </button>
            <button
              onClick={() => setShowEventPicker(!showEventPicker)}
              className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm border border-green-900/30"
            >
              Choose Template
            </button>
          </div>

          {/* Event Template Picker */}
          {showEventPicker && (
            <div className="mt-3 space-y-1">
              {(customEventNames && customEventNames.length > 0 ? customEventNames : DEFAULT_EVENT_TEMPLATES).map((template) => (
                <button
                  key={template}
                  onClick={() => handleStartEvent(template)}
                  disabled={startingEvent}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-green-600/20 text-white text-sm transition-colors text-left disabled:opacity-30"
                >
                  <svg
                    className="w-3 h-3 text-green-400 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                  {template}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Roundtable Card */}
        <div className="bg-white/5 rounded-xl border border-green-900/30 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
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
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Roundtable</h3>
          </div>
          <p className="text-white/40 text-sm mb-4 flex-1">
            End the day phase and begin the roundtable discussion, leading to
            the final vote.
          </p>
          <button
            onClick={handleStartRoundtable}
            disabled={startingRoundtable}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {startingRoundtable ? "Starting..." : "Start Roundtable"}
          </button>
        </div>
      </div>
    </div>
  );
}
