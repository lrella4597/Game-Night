"use client";

import { useState } from "react";
import { useSoundEffects } from "@/lib/audio/useSoundEffects";

export default function LiveSoundControls() {
  const { enabled, setEnabled, volume, setVolume, play } = useSoundEffects();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-10 h-10 rounded-full bg-[#060CE9]/80 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-[#060CE9] transition-all shadow-lg"
        title="Sound Settings"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
          {enabled ? (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </>
          ) : (
            <>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </>
          )}
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="bg-[#0a0f3a]/95 backdrop-blur border border-white/15 rounded-xl p-4 w-64 shadow-2xl">
          {/* Enable toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Sound Effects</span>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? "bg-green-500" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/50 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              disabled={!enabled}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
              style={{
                background: enabled
                  ? `linear-gradient(to right, #FFD700 0%, #FFD700 ${volume * 100}%, rgba(255,255,255,0.15) ${volume * 100}%, rgba(255,255,255,0.15) 100%)`
                  : "rgba(255,255,255,0.15)",
              }}
            />
            <span className="text-xs font-mono text-white/60 w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>

          {/* Quick test */}
          <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
            <button
              onClick={() => play("correct")}
              disabled={!enabled}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-30 transition-all"
            >
              Test
            </button>
            <button
              onClick={() => play("buzz-in")}
              disabled={!enabled}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 disabled:opacity-30 transition-all"
            >
              Buzzer
            </button>
            <button
              onClick={() => play("daily-double")}
              disabled={!enabled}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-30 transition-all"
            >
              Fanfare
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
