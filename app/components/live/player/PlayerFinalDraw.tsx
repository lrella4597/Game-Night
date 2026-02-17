"use client";

import { useState, useRef, useCallback } from "react";
import DrawingCanvas from "@/app/components/live/shared/DrawingCanvas";
import LiveTimer from "@/app/components/live/shared/LiveTimer";

interface PlayerFinalDrawProps {
  clue: string;
  category: string;
  timerRemaining: number | null;
  timerRunning: boolean;
  onSubmit: (drawingDataUrl: string, textAnswer?: string) => void;
  disabled?: boolean;
}

export default function PlayerFinalDraw({
  clue,
  category,
  timerRemaining,
  timerRunning,
  onSubmit,
  disabled = false,
}: PlayerFinalDrawProps) {
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const lastExportRef = useRef<string>("");

  const handleExport = useCallback((dataUrl: string) => {
    lastExportRef.current = dataUrl;
  }, []);

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(lastExportRef.current, textAnswer || undefined);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-6xl mb-2">&#9989;</div>
        <h2 className="text-2xl font-bold text-green-400">Answer Submitted!</h2>
        <p className="text-blue-300 text-sm">Waiting for other players...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4">
      <h2 className="text-xl font-bold text-[#FFD700]">Final Jeopardy!</h2>
      <p className="text-[#FFD700] text-sm font-semibold">{category}</p>

      {/* Clue */}
      <div className="bg-[#060CE9] border-2 border-[#FFD700] rounded-xl p-4 w-full max-w-md text-center">
        <p className="text-white text-lg leading-relaxed">{clue}</p>
      </div>

      {timerRunning && (
        <LiveTimer remaining={timerRemaining} running={timerRunning} />
      )}

      {/* Drawing Canvas */}
      <div className="w-full max-w-md">
        <p className="text-blue-300 text-sm mb-2">Draw your answer:</p>
        <DrawingCanvas
          width={400}
          height={250}
          onExport={handleExport}
          disabled={disabled}
        />
      </div>

      {/* Optional text answer */}
      <div className="w-full max-w-md">
        <label className="text-blue-300 text-sm mb-1 block">Or type your answer (optional):</label>
        <input
          type="text"
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={disabled}
          placeholder="What is..."
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 focus:border-[#FFD700] focus:outline-none transition-colors"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full max-w-md py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 disabled:opacity-30 transition-all shadow-lg"
      >
        Submit Answer
      </button>
    </div>
  );
}
