"use client";

import { useSoundEffects } from "@/lib/audio/useSoundEffects";

export default function SoundSettingsTab() {
  const { enabled, setEnabled, volume, setVolume, play } = useSoundEffects();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Sound Settings</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure audio feedback and effects
        </p>
      </div>

      {/* Enable/Disable Sounds */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Sound Effects</h3>
            <p className="text-sm text-slate-600 mt-1">
              Play audio feedback for game events
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              enabled ? "bg-green-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Volume Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Volume</h3>
        <div className="flex items-center gap-4">
          <span className="text-2xl">🔇</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={!enabled}
            className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            style={{
              background: enabled
                ? `linear-gradient(to right, #10B981 0%, #10B981 ${volume * 100}%, #E2E8F0 ${volume * 100}%, #E2E8F0 100%)`
                : "#E2E8F0",
            }}
          />
          <span className="text-2xl">🔊</span>
          <span className="text-sm font-mono text-slate-600 w-12 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Test Sounds */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Test Sounds</h3>
        <p className="text-sm text-slate-600 mb-4">
          Click buttons to preview sound effects
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => play("tile-click")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
          >
            🎯 Tile Click
          </button>
          <button
            onClick={() => play("correct")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm text-green-700"
          >
            ✅ Correct
          </button>
          <button
            onClick={() => play("incorrect")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm text-red-700"
          >
            ❌ Incorrect
          </button>
          <button
            onClick={() => play("reveal")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
          >
            👁️ Reveal
          </button>
          <button
            onClick={() => play("timer-tick")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
          >
            ⏱️ Timer Tick
          </button>
          <button
            onClick={() => play("timer-end")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm"
          >
            ⏰ Timer End
          </button>
          <button
            onClick={() => play("power-up")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm text-purple-700"
          >
            ⚡ Power-Up
          </button>
          <button
            onClick={() => play("daily-double")}
            disabled={!enabled}
            className="px-4 py-3 rounded-lg border border-slate-200 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm text-yellow-700"
          >
            🎺 Daily Double
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div>
            <p className="text-sm font-semibold text-blue-900">About Sound Effects</p>
            <p className="text-xs text-blue-700 mt-1">
              All sounds are generated using the Web Audio API - no downloads required!
              Your preferences are saved locally.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
