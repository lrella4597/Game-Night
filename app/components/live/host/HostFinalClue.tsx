"use client";

import LiveTimer from "@/app/components/live/shared/LiveTimer";

interface HostFinalClueProps {
  category: string;
  clue: string;
  answer: string;
  timerRemaining: number | null;
  timerRunning: boolean;
  showAnswer: boolean;
  onStartDrawing: () => void;
  onShowAnswer: () => void;
}

export default function HostFinalClue({
  category,
  clue,
  answer,
  timerRemaining,
  timerRunning,
  showAnswer,
  onStartDrawing,
  onShowAnswer,
}: HostFinalClueProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
      <h2 className="text-xl font-bold text-blue-200 uppercase tracking-wider">Final Jeopardy!</h2>
      <p className="text-[#FFD700] text-lg font-semibold">{category}</p>

      <div className="bg-[#060CE9] border-4 border-[#FFD700] rounded-2xl p-10 max-w-3xl w-full text-center shadow-2xl">
        <p className="text-2xl md:text-3xl text-white leading-relaxed font-medium">{clue}</p>
      </div>

      {timerRunning && (
        <div className="mt-2">
          <LiveTimer remaining={timerRemaining} running={timerRunning} />
        </div>
      )}

      {showAnswer && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 max-w-2xl w-full text-center">
          <p className="text-sm text-green-300 uppercase tracking-wider mb-2">Correct Response</p>
          <p className="text-2xl text-green-400 font-bold">{answer}</p>
        </div>
      )}

      <div className="flex gap-4">
        {!showAnswer && (
          <button
            onClick={onShowAnswer}
            className="px-6 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            Show Answer
          </button>
        )}
        <button
          onClick={onStartDrawing}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
        >
          Open Drawing Canvas
        </button>
      </div>
    </div>
  );
}
