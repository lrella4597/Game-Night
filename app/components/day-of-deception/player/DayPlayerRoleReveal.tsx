"use client";

import React from "react";

interface DayPlayerRoleRevealProps {
  role: "traitor" | "faithful" | null;
  fellowDeceivers: { id: string; displayName: string }[];
  loading: boolean;
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function DaggerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v8" />
      <path d="M8 6h8" />
      <path d="M12 10l-2 10" />
      <path d="M12 10l2 10" />
      <path d="M10 15h4" />
    </svg>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#1a1f14] flex flex-col items-center justify-center px-4">
      {/* Shimmer card */}
      <div className="w-full max-w-xs space-y-6 animate-pulse">
        <div className="mx-auto w-20 h-20 rounded-full bg-white/10" />
        <div className="h-8 bg-white/10 rounded-lg mx-auto w-48" />
        <div className="h-4 bg-white/5 rounded mx-auto w-64" />
        <div className="h-4 bg-white/5 rounded mx-auto w-56" />
      </div>
      <p className="mt-8 text-sm text-green-400/50 animate-pulse">
        Assigning roles...
      </p>
    </div>
  );
}

export default function DayPlayerRoleReveal({
  role,
  fellowDeceivers,
  loading,
}: DayPlayerRoleRevealProps) {
  if (loading || role === null) {
    return <LoadingState />;
  }

  const isDeceiver = role === "traitor";

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 ${
        isDeceiver
          ? "bg-gradient-to-b from-[#2a1414] via-[#1f1010] to-[#1a0f0f]"
          : "bg-gradient-to-b from-[#142a14] via-[#101f10] to-[#0f1a0f]"
      }`}
    >
      {/* Icon */}
      <div
        className={`mb-6 p-5 rounded-full border-2 ${
          isDeceiver
            ? "border-red-500/40 bg-red-500/10"
            : "border-green-500/40 bg-green-500/10"
        }`}
      >
        {isDeceiver ? (
          <DaggerIcon className="w-12 h-12 text-red-400" />
        ) : (
          <ShieldIcon className="w-12 h-12 text-green-400" />
        )}
      </div>

      {/* Role title */}
      <h1
        className={`text-3xl font-bold mb-2 tracking-wide ${
          isDeceiver ? "text-red-400" : "text-green-400"
        }`}
      >
        You are a{" "}
        <span className={isDeceiver ? "text-red-300" : "text-green-300"}>
          {isDeceiver ? "DECEIVER" : "LOYAL"}
        </span>
      </h1>

      {/* Divider */}
      <div
        className={`w-24 h-0.5 my-4 ${
          isDeceiver ? "bg-red-500/30" : "bg-green-500/30"
        }`}
      />

      {/* Objective text */}
      <p className="text-white/70 text-sm text-center max-w-xs leading-relaxed mb-6">
        {isDeceiver
          ? "Complete secret missions. Earn Shadow Tokens. Survive the final vote."
          : "Observe carefully. Find the deceivers. Vote wisely at the roundtable."}
      </p>

      {/* Deceiver: fellow deceivers */}
      {isDeceiver && fellowDeceivers.length > 0 && (
        <div className="w-full max-w-xs mt-2">
          <p className="text-xs uppercase tracking-wider text-red-400/60 mb-3 text-center">
            Your fellow deceivers
          </p>
          <div className="space-y-2">
            {fellowDeceivers.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-900/30 bg-red-500/5"
              >
                <DaggerIcon className="w-4 h-4 text-red-400/60 flex-shrink-0" />
                <span className="text-red-300/80 text-sm">{t.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loyal: encouragement */}
      {!isDeceiver && (
        <div className="w-full max-w-xs mt-2 p-4 rounded-lg border border-green-900/30 bg-green-500/5">
          <p className="text-green-300/70 text-sm text-center leading-relaxed">
            Trust no one completely. Watch for subtle signs. The deceivers are
            among you.
          </p>
        </div>
      )}
    </div>
  );
}
