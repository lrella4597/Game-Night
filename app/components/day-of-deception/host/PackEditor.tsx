"use client";

import { useState } from "react";
import type { MissionPackItem, EventPackItem } from "@/lib/chat/types";

interface PackEditorProps {
  missionPack: MissionPackItem[];
  eventPack: EventPackItem[];
  onMissionPackChange: (pack: MissionPackItem[]) => void;
  onEventPackChange: (pack: EventPackItem[]) => void;
  onApply: () => void;
  applying: boolean;
}

const CATEGORY_COLORS: Record<MissionPackItem["category"], string> = {
  social: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  conversational: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  sneaky: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const RISK_COLORS: Record<MissionPackItem["riskLevel"], string> = {
  low: "bg-green-500/20 text-green-300 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  high: "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function PackEditor({
  missionPack,
  eventPack,
  onMissionPackChange,
  onEventPackChange,
  onApply,
  applying,
}: PackEditorProps) {
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editMissionText, setEditMissionText] = useState("");
  const [editEventName, setEditEventName] = useState("");
  const [editEventInstructions, setEditEventInstructions] = useState("");

  // ── Mission Actions ────────────────────────────────────────────────

  const toggleMissionLock = (id: string) => {
    onMissionPackChange(
      missionPack.map((m) =>
        m.id === id ? { ...m, locked: !m.locked } : m
      )
    );
  };

  const deleteMission = (id: string) => {
    onMissionPackChange(missionPack.filter((m) => m.id !== id));
  };

  const startEditMission = (mission: MissionPackItem) => {
    setEditingMissionId(mission.id);
    setEditMissionText(mission.text);
  };

  const saveMissionEdit = (id: string) => {
    onMissionPackChange(
      missionPack.map((m) =>
        m.id === id ? { ...m, text: editMissionText } : m
      )
    );
    setEditingMissionId(null);
    setEditMissionText("");
  };

  // ── Event Actions ──────────────────────────────────────────────────

  const toggleEventLock = (id: string) => {
    onEventPackChange(
      eventPack.map((e) =>
        e.id === id ? { ...e, locked: !e.locked } : e
      )
    );
  };

  const deleteEvent = (id: string) => {
    onEventPackChange(eventPack.filter((e) => e.id !== id));
  };

  const startEditEvent = (event: EventPackItem) => {
    setEditingEventId(event.id);
    setEditEventName(event.name);
    setEditEventInstructions(event.instructions);
  };

  const saveEventEdit = (id: string) => {
    onEventPackChange(
      eventPack.map((e) =>
        e.id === id
          ? { ...e, name: editEventName, instructions: editEventInstructions }
          : e
      )
    );
    setEditingEventId(null);
    setEditEventName("");
    setEditEventInstructions("");
  };

  return (
    <div className="space-y-8">
      {/* ── Mission Pack Section ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-400">
            Mission Pack ({missionPack.length})
          </h3>
          <div className="flex gap-2 text-xs text-white/40">
            <span className="px-2 py-0.5 rounded border border-blue-500/30 text-blue-300">
              social
            </span>
            <span className="px-2 py-0.5 rounded border border-purple-500/30 text-purple-300">
              conversational
            </span>
            <span className="px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">
              sneaky
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {missionPack.map((mission) => (
            <div
              key={mission.id}
              className={`bg-white/5 rounded-xl border p-3 transition-all ${
                mission.locked
                  ? "border-green-500/40 bg-green-900/10"
                  : "border-green-900/30"
              }`}
            >
              {editingMissionId === mission.id ? (
                // Editing mode
                <div className="space-y-2">
                  <textarea
                    value={editMissionText}
                    onChange={(e) => setEditMissionText(e.target.value)}
                    onBlur={() => saveMissionEdit(mission.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        saveMissionEdit(mission.id);
                      }
                      if (e.key === "Escape") {
                        setEditingMissionId(null);
                      }
                    }}
                    className="w-full bg-[#141a0f] text-white text-sm px-3 py-2 rounded-lg border border-green-600/50 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                    rows={2}
                    autoFocus
                  />
                </div>
              ) : (
                // Display mode
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{mission.text}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          CATEGORY_COLORS[mission.category]
                        }`}
                      >
                        {mission.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${
                          RISK_COLORS[mission.riskLevel]
                        }`}
                      >
                        {mission.riskLevel}
                      </span>
                      {mission.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Lock toggle */}
                    <button
                      onClick={() => toggleMissionLock(mission.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        mission.locked
                          ? "text-green-400 bg-green-500/10"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5"
                      }`}
                      title={mission.locked ? "Unlock" : "Lock"}
                    >
                      {mission.locked ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEditMission(mission)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                      title="Edit"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteMission(mission.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Event Pack Section ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-400">
            Event Pack ({eventPack.length})
          </h3>
        </div>

        <div className="space-y-3">
          {eventPack.map((event) => (
            <div
              key={event.id}
              className={`bg-white/5 rounded-xl border p-4 transition-all ${
                event.locked
                  ? "border-green-500/40 bg-green-900/10"
                  : "border-green-900/30"
              }`}
            >
              {editingEventId === event.id ? (
                // Editing mode
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editEventName}
                    onChange={(e) => setEditEventName(e.target.value)}
                    className="w-full bg-[#141a0f] text-white text-sm px-3 py-2 rounded-lg border border-green-600/50 focus:outline-none focus:ring-2 focus:ring-green-600"
                    placeholder="Event name"
                    autoFocus
                  />
                  <textarea
                    value={editEventInstructions}
                    onChange={(e) => setEditEventInstructions(e.target.value)}
                    onBlur={() => saveEventEdit(event.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingEventId(null);
                      }
                    }}
                    className="w-full bg-[#141a0f] text-white text-sm px-3 py-2 rounded-lg border border-green-600/50 focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
                    rows={3}
                    placeholder="Instructions"
                  />
                  <button
                    onClick={() => saveEventEdit(event.id)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-500 transition-all"
                  >
                    Save
                  </button>
                </div>
              ) : (
                // Display mode
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-white">
                        {event.name}
                      </h4>
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {event.durationMinutes} min
                      </span>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {event.instructions}
                    </p>
                    {event.deceiverSecretMission && (
                      <div className="mt-2 px-2 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-xs text-red-300">
                          <span className="font-semibold">Deceiver Goal:</span>{" "}
                          {event.deceiverSecretMission}
                        </p>
                      </div>
                    )}
                    {event.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {event.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Lock toggle */}
                    <button
                      onClick={() => toggleEventLock(event.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        event.locked
                          ? "text-green-400 bg-green-500/10"
                          : "text-white/30 hover:text-white/60 hover:bg-white/5"
                      }`}
                      title={event.locked ? "Unlock" : "Lock"}
                    >
                      {event.locked ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEditEvent(event)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
                      title="Edit"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Apply Button ───────────────────────────────────────────── */}
      <div className="flex justify-center pt-4 pb-8">
        <button
          onClick={onApply}
          disabled={applying || missionPack.length === 0 || eventPack.length === 0}
          className="px-8 py-4 rounded-xl font-bold text-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-900/30"
        >
          {applying ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Applying...
            </span>
          ) : (
            "Apply to Session"
          )}
        </button>
      </div>
    </div>
  );
}
