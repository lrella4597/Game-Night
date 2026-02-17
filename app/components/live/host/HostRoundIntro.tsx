"use client";

import { useEffect } from "react";

interface HostRoundIntroProps {
  round: number;
  onProceed: () => void;
}

export default function HostRoundIntro({ round, onProceed }: HostRoundIntroProps) {
  // Auto-advance after 4 seconds
  useEffect(() => {
    const timer = setTimeout(onProceed, 4000);
    return () => clearTimeout(timer);
  }, [onProceed]);

  const title = round === 2 ? "Double Jeopardy!" : "Jeopardy!";
  const subtitle = round === 2 ? "Values are doubled!" : "Let\u2019s play!";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-6xl md:text-8xl font-bold text-[#FFD700] animate-pulse tracking-tight">
        {title}
      </h1>
      <p className="text-2xl text-blue-200">{subtitle}</p>
      <button
        onClick={onProceed}
        className="mt-8 px-8 py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg"
      >
        Start Round {round}
      </button>
    </div>
  );
}
