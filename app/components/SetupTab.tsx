"use client";

import { useState } from "react";
import { useTeams, TEAM_COLORS, defaultTeam, type Team } from "@/lib/data/useTeams";
import { useGameSettings } from "@/lib/data/useGameSettings";
import { useBoards } from "@/lib/data/useBoards";
import type { GameSettings } from "@/app/data/gameSettings";
import { DEFAULT_SETTINGS } from "@/app/data/gameSettings";
import LoadingSpinner from "./LoadingSpinner";

export default function SetupTab() {
  const { teams, saveTeams, loading: teamsLoading } = useTeams();
  const { settings, saveSettings, loading: settingsLoading } = useGameSettings();
  const { currentBoard, saveCurrentBoard, loading: boardsLoading } = useBoards();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState<Record<string, string>>({});

  // ── Persist helpers ──────────────────────────────────────────────────────────

  async function persistTeams(updated: Team[]) {
    await saveTeams(updated);
  }

  async function persistSettings(updated: GameSettings) {
    await saveSettings(updated);
  }

  // ── Teams ────────────────────────────────────────────────────────────────────

  function handleAddTeam() {
    const next = defaultTeam(teams.length);
    persistTeams([...teams, next]);
    setExpandedTeam(next.id);
  }

  function handleRemoveTeam(id: string) {
    if (!window.confirm("Remove this team?")) return;
    persistTeams(teams.filter((t) => t.id !== id));
    if (expandedTeam === id) setExpandedTeam(null);
  }

  function updateTeam(id: string, patch: Partial<Team>) {
    persistTeams(teams.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // ── Players ──────────────────────────────────────────────────────────────────

  function handleAddPlayer(teamId: string) {
    const name = (newPlayerName[teamId] ?? "").trim();
    if (!name) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    updateTeam(teamId, { players: [...team.players, name] });
    setNewPlayerName((prev) => ({ ...prev, [teamId]: "" }));
  }

  function handleRemovePlayer(teamId: string, playerIndex: number) {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    updateTeam(teamId, {
      players: team.players.filter((_, i) => i !== playerIndex),
    });
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  function handleResetScores() {
    if (!window.confirm("Reset all team scores to 0?")) return;
    persistTeams(teams.map((t) => ({ ...t, score: 0 })));
  }

  function handleResetPowerUps() {
    if (!window.confirm("Reset all power-ups to unused?")) return;
    persistTeams(
      teams.map((t) => ({
        ...t,
        powerUps: { doubleDown: false, doubleDip: false, phoneAFriend: false },
      }))
    );
  }

  async function handleApplyFlatPoints() {
    const value = settings.flatPointValue;
    if (!window.confirm(`Change all question values on the board to $${value}?\n\nThe page will reload to show the updated values.`)) return;

    if (!currentBoard) return;

    const updatedBoard = {
      ...currentBoard,
      rowValues: currentBoard.rowValues.map(() => value),
      columns: currentBoard.columns.map((col) => ({
        ...col,
        questions: col.questions.map((q) => ({
          ...q,
          value: value,
        })),
      })),
    };

    await saveCurrentBoard(updatedBoard);

    // Reload the page to show updated values
    window.location.reload();
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  // Show loading state while data is loading
  if (teamsLoading || settingsLoading || boardsLoading) {
    return <LoadingSpinner message="Loading setup..." />;
  }

  return (
    <div className="w-full max-w-3xl flex flex-col gap-8 pb-24">

      {/* ── Teams section ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Teams
            </h2>
            <p className="text-slate-600 text-sm mt-0.5">
              {teams.length} team{teams.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleResetScores}
              disabled={teams.length === 0}
              className="btn-secondary hover:bg-slate-50 disabled:opacity-40"
            >
              Reset Scores
            </button>
            <button
              onClick={handleResetPowerUps}
              disabled={teams.length === 0}
              className="btn-secondary hover:bg-slate-50 disabled:opacity-40"
            >
              Reset Power-Ups
            </button>
            <button
              onClick={handleAddTeam}
              className="btn-primary"
            >
              Add Team
            </button>
          </div>
        </div>

        {teams.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No teams yet. Add one to get started.
          </div>
        )}

        {teams.map((team, idx) => {
          const isOpen = expandedTeam === team.id;
          return (
            <div
              key={team.id}
              className={`rounded-xl border-2 flex flex-col bg-white transition-all ${
                isOpen ? "border-slate-300" : "border-slate-200"
              }`}
              style={{
                borderColor: isOpen ? team.color : undefined,
              }}
            >
              {/* Team header row */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedTeam(isOpen ? null : team.id)}
              >
                {/* Color swatch */}
                <div
                  className="w-5 h-5 rounded-full shrink-0 border-2 border-slate-200"
                  style={{ backgroundColor: team.color }}
                />
                <span className="font-bold tracking-tight flex-1 text-slate-900">
                  {team.name}
                </span>
                <span className="text-slate-500 text-xs">
                  {team.players.length} player{team.players.length !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveTeam(team.id); }}
                  className="px-2 py-1 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Expanded fields */}
              {isOpen && (
                <div className="px-4 pb-4 flex flex-col gap-4 border-t border-slate-200 pt-4">
                  {/* Name + Color row */}
                  <div className="flex gap-3 items-end">
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-semibold tracking-tight text-slate-700">
                        Team Name
                      </label>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => updateTeam(team.id, { name: e.target.value })}
                        maxLength={30}
                        className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold tracking-tight text-slate-700">
                        Color
                      </label>
                      <div className="flex gap-1.5 flex-wrap" style={{ maxWidth: "180px" }}>
                        {TEAM_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => updateTeam(team.id, { color: c })}
                            className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                            style={{
                              backgroundColor: c,
                              border: team.color === c ? "3px solid #0B1220" : "2px solid #e2e8f0",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Players */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-tight text-slate-700">
                      Players
                    </label>
                    {team.players.length === 0 && (
                      <p className="text-slate-400 text-xs italic">
                        No players — team score still trackable.
                      </p>
                    )}
                    {team.players.map((player, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <span className="text-slate-900 text-sm flex-1">{player}</span>
                        <button
                          onClick={() => handleRemovePlayer(team.id, pIdx)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={newPlayerName[team.id] ?? ""}
                        onChange={(e) =>
                          setNewPlayerName((prev) => ({ ...prev, [team.id]: e.target.value }))
                        }
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddPlayer(team.id); }}
                        placeholder="Player name"
                        maxLength={30}
                        className="flex-1 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
                      />
                      <button
                        onClick={() => handleAddPlayer(team.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold bg-accent/10 text-slate-900 border border-accent/30 hover:bg-accent/20 transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ── Game Settings section ── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Game Settings
          </h2>
          <p className="text-slate-600 text-sm mt-0.5">
            Timers and scoring rules
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-5">
          {/* Game Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-tight text-slate-700">
              Game Mode
            </label>
            <div className="flex gap-3 flex-wrap">
              {(
                [
                  {
                    value: "manual",
                    title: "Manual (Classic)",
                    desc: "No AI generation. All questions entered by hand. AI buttons are hidden.",
                  },
                  {
                    value: "ai",
                    title: "AI Mode",
                    desc: "Generate questions with Claude. Generate All / Column / Refresh buttons are shown.",
                  },
                ] as const
              ).map(({ value, title, desc }) => (
                <button
                  key={value}
                  onClick={() => persistSettings({ ...settings, mode: value })}
                  className={`flex-1 min-w-[180px] rounded-xl border-2 p-3 text-left transition-all ${
                    settings.mode === value
                      ? "bg-accent/10 border-accent"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-3 h-3 rounded-full border-2 shrink-0 ${
                        settings.mode === value
                          ? "border-accent bg-accent"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                    <span className="font-semibold text-sm tracking-tight text-slate-900">
                      {title}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-snug pl-5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Timers */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold tracking-tight text-slate-700">
                Question Timer (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={settings.questionTimerSeconds}
                onChange={(e) =>
                  persistSettings({ ...settings, questionTimerSeconds: Math.max(5, Number(e.target.value)) })
                }
                className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-xs font-semibold tracking-tight text-slate-700">
                Steal Timer (seconds)
              </label>
              <input
                type="number"
                min={3}
                max={60}
                value={settings.stealTimerSeconds}
                onChange={(e) =>
                  persistSettings({ ...settings, stealTimerSeconds: Math.max(3, Number(e.target.value)) })
                }
                className="w-full rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          {/* Point Mode */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-tight text-slate-700">
              Point Mode
            </label>
            <div className="flex gap-3 flex-wrap">
              {(["classic", "flat"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => persistSettings({ ...settings, pointMode: mode })}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm border-2 transition-all ${
                    settings.pointMode === mode
                      ? "btn-primary"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {mode === "classic" ? "Classic (tile value)" : "Flat value"}
                </button>
              ))}
            </div>
            {settings.pointMode === "flat" && (
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold tracking-tight text-slate-700">
                    Flat Point Value
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.flatPointValue}
                    onChange={(e) =>
                      persistSettings({ ...settings, flatPointValue: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-40 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none bg-slate-50 border border-slate-200"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApplyFlatPoints}
                    className="px-4 py-2 rounded-lg font-semibold text-sm bg-accent text-slate-900 hover:bg-accent/80 transition-all border border-accent"
                  >
                    Apply to Board
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  This will change all question values on the board to ${settings.flatPointValue} and reload the page to show the updates.
                </p>
              </div>
            )}
          </div>

          {/* Reset to defaults */}
          <button
            onClick={() => persistSettings(DEFAULT_SETTINGS)}
            className="self-start btn-secondary hover:bg-slate-50"
          >
            Reset to Defaults
          </button>
        </div>
      </section>
    </div>
  );
}
