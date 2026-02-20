"use client";

import { useState, useEffect } from "react";

interface HowToPlaySection {
  title: string;
  steps: string[];
}

interface HowToPlayModalProps {
  gameKey: string; // localStorage key like "howto_jeopardy_host"
  title: string;
  sections: HowToPlaySection[];
  accentColor?: string; // tailwind color class like "blue" or "red"
}

export default function HowToPlayModal({
  gameKey,
  title,
  sections,
  accentColor = "blue",
}: HowToPlayModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(gameKey);
    if (!seen) {
      setIsOpen(true);
    }
  }, [gameKey]);

  const handleClose = () => {
    localStorage.setItem(gameKey, "true");
    setIsOpen(false);
  };

  const colorMap: Record<string, { bg: string; border: string; button: string; dot: string }> = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      button: "bg-blue-600 hover:bg-blue-700",
      dot: "bg-blue-500",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      button: "bg-red-600 hover:bg-red-700",
      dot: "bg-red-500",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      button: "bg-amber-600 hover:bg-amber-700",
      dot: "bg-amber-500",
    },
  };

  const colors = colorMap[accentColor] || colorMap.blue;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
        title="How to Play"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        How to Play
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col animate-slideUp">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="space-y-5">
            {sections.map((section, i) => (
              <div key={i}>
                <h3 className={`text-sm font-bold uppercase tracking-wide mb-2 ${accentColor === "red" ? "text-red-600" : accentColor === "amber" ? "text-amber-600" : "text-blue-600"}`}>
                  {section.title}
                </h3>
                <div className={`rounded-lg ${colors.bg} ${colors.border} border p-3`}>
                  <ul className="space-y-2">
                    {section.steps.map((step, j) => (
                      <li key={j} className="flex gap-2 text-sm text-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} mt-1.5 shrink-0`} />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-4">
          <button
            onClick={handleClose}
            className={`w-full py-3 px-4 ${colors.button} text-white font-semibold rounded-lg transition-all`}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
