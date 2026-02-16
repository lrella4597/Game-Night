"use client";

import HelpContent from "./HelpContent";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col animate-slideUp"
          style={{
            padding: "2rem",
            maxHeight: "90vh",
            animation: "slideUp 0.3s ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                ❓ Help & Guide
              </h2>
              <p className="text-slate-600 mt-2">
                Everything you need to know about Jeopardy Game Night
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-900 text-3xl font-bold leading-none"
              aria-label="Close help"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pr-2">
            <HelpContent />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-lg font-semibold bg-slate-600 text-white hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
