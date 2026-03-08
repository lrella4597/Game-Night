"use client";

import LiveTimer from "@/app/components/live/shared/LiveTimer";

interface HostClueDisplayProps {
  categoryTitle: string;
  clueText: string;
  clueValue: number;
  answer: string;
  timerRemaining: number | null;
  timerRunning: boolean;
  showAnswer: boolean;
  onOpenBuzzer: () => void;
  onShowAnswer: () => void;
  onSkip: () => void;
}

export default function HostClueDisplay({
  categoryTitle,
  clueText,
  clueValue,
  answer,
  timerRemaining,
  timerRunning,
  showAnswer,
  onOpenBuzzer,
  onShowAnswer,
  onSkip,
}: HostClueDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center">
      {/* Category + Value */}
      <p className="text-blue-300 text-lg uppercase tracking-wider mb-2">
        {categoryTitle}
      </p>
      <p className="text-[#FFD700] text-2xl font-bold mb-8">${clueValue}</p>

      {/* Clue text */}
      <p className="text-white text-3xl md:text-4xl font-medium leading-relaxed max-w-3xl mb-8">
        {clueText}
      </p>

      {/* Answer (host only) */}
      <div className="mb-8">
        {showAnswer ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-green-400 text-2xl font-bold">{answer}</p>
            <button
              onClick={onShowAnswer}
              className="text-white/40 hover:text-white/70 text-xs underline transition-colors"
            >
              Hide Answer
            </button>
          </div>
        ) : (
          <button
            onClick={onShowAnswer}
            className="text-blue-400 hover:text-blue-300 text-sm underline"
          >
            Show Answer (host only)
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="mb-8">
        <LiveTimer remaining={timerRemaining} running={timerRunning} />
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={onOpenBuzzer}
          className="px-8 py-4 rounded-xl font-bold text-xl bg-green-500 text-white hover:bg-green-400 transition-all shadow-lg"
        >
          Open Buzzer
        </button>
        <button
          onClick={onSkip}
          className="px-6 py-4 rounded-xl font-bold text-lg bg-white/10 text-white hover:bg-white/20 transition-all"
        >
          Skip / No Answer
        </button>
      </div>
    </div>
  );
}
