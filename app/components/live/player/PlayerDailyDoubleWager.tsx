"use client";

import { useState } from "react";

interface PlayerDailyDoubleWagerProps {
  currentScore: number;
  maxClueValue: number;
  category: string;
  onSubmitWager: (wager: number) => void;
}

export default function PlayerDailyDoubleWager({
  currentScore,
  maxClueValue,
  category,
  onSubmitWager,
}: PlayerDailyDoubleWagerProps) {
  // DD max wager: the greater of your score or the max clue value in the round
  const maxWager = Math.max(currentScore > 0 ? currentScore : 0, maxClueValue);
  const [wager, setWager] = useState(5);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    onSubmitWager(wager);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-6xl mb-2">&#9989;</div>
        <h2 className="text-2xl font-bold text-green-400">Wager Locked!</h2>
        <p className="text-xl text-white font-bold">${wager.toLocaleString()}</p>
        <p className="text-blue-300 text-sm">Waiting for the host to show the clue...</p>
      </div>
    );
  }

  const quickAmounts = [
    5,
    Math.max(5, Math.floor(maxWager * 0.25)),
    Math.max(5, Math.floor(maxWager * 0.5)),
    maxWager,
  ].filter((amount, idx, arr) => arr.indexOf(amount) === idx);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <h2 className="text-3xl font-bold text-[#FFD700]">Daily Double!</h2>
      <p className="text-lg text-blue-200">
        Category: <span className="text-white font-bold">{category}</span>
      </p>

      <div className="w-full max-w-sm">
        <p className="text-blue-300 text-sm mb-2">
          Your score: <span className="text-white font-bold">${currentScore.toLocaleString()}</span>
        </p>
        <p className="text-blue-300 text-sm mb-4">
          Max wager: <span className="text-[#FFD700] font-bold">${maxWager.toLocaleString()}</span>
        </p>

        <label className="text-white text-sm font-medium mb-2 block">Your Wager</label>
        <input
          type="number"
          min={5}
          max={maxWager}
          value={wager}
          onChange={(e) => {
            const val = Math.max(5, Math.min(maxWager, parseInt(e.target.value) || 5));
            setWager(val);
          }}
          className="w-full px-4 py-4 rounded-xl bg-white/10 border-2 border-white/20 text-white text-2xl font-bold text-center focus:border-[#FFD700] focus:outline-none transition-colors"
        />

        {/* Quick wager buttons */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {quickAmounts.map((amount, idx) => (
            <button
              key={`wager-${idx}-${amount}`}
              onClick={() => setWager(amount)}
              className="py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all"
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full max-w-sm py-4 rounded-xl font-bold text-xl bg-[#FFD700] text-[#060CE9] hover:bg-yellow-300 transition-all shadow-lg mt-2"
      >
        Lock In Wager
      </button>
    </div>
  );
}
