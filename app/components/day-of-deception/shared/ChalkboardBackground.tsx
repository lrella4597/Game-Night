"use client";

import React from "react";

interface ChalkboardBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export default function ChalkboardBackground({
  children,
  className = "",
}: ChalkboardBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen w-full bg-gradient-to-b from-[#2d3a2d] via-[#1e2b1e] to-[#1a2518] overflow-hidden ${className}`}
    >
      {/* Inner shadow / vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 120px 40px rgba(0, 0, 0, 0.5)",
        }}
      />

      {/* Grain / noise texture pseudo-element */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 35%, rgba(255,255,255,0.15) 0.5px, transparent 0.5px),
            radial-gradient(circle at 75% 55%, rgba(255,255,255,0.12) 0.5px, transparent 0.5px),
            radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0.5px, transparent 0.5px),
            radial-gradient(circle at 60% 15%, rgba(255,255,255,0.14) 0.5px, transparent 0.5px),
            radial-gradient(circle at 90% 70%, rgba(255,255,255,0.11) 0.5px, transparent 0.5px),
            radial-gradient(circle at 10% 60%, rgba(255,255,255,0.13) 0.5px, transparent 0.5px),
            radial-gradient(circle at 50% 45%, rgba(255,255,255,0.09) 0.5px, transparent 0.5px),
            radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12) 0.5px, transparent 0.5px)
          `,
          backgroundSize: `
            7px 7px,
            11px 11px,
            13px 13px,
            9px 9px,
            15px 15px,
            8px 8px,
            12px 12px,
            10px 10px
          `,
        }}
      />

      {/* Subtle horizontal streaks to mimic a worn chalkboard surface */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.08) 2px,
              rgba(255,255,255,0.08) 3px
            )
          `,
          backgroundSize: "100% 5px",
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
