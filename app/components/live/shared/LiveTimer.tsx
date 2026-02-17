"use client";

interface LiveTimerProps {
  remaining: number | null;
  running: boolean;
}

export default function LiveTimer({ remaining, running }: LiveTimerProps) {
  if (remaining === null) return null;

  const isLow = remaining <= 5;

  return (
    <div
      className={`text-5xl font-mono font-bold tabular-nums ${
        isLow ? "text-red-400 animate-pulse" : "text-white"
      }`}
    >
      {remaining}
    </div>
  );
}
