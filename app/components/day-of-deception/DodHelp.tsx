"use client";

import { useEffect, useState } from "react";
import { Button, Icon, display } from "./ui";

interface Section {
  title: string;
  steps: string[];
}

/**
 * "How to play" for Day of Deception: a small round button under the top
 * bar that opens a dark bottom sheet. Opens by itself the first time.
 */
export default function DodHelp({ gameKey, title, sections }: { gameKey: string; title: string; sections: Section[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(gameKey)) setOpen(true);
    } catch {
      // Private mode: just don't auto-open
    }
  }, [gameKey]);

  function close() {
    try {
      localStorage.setItem(gameKey, "true");
    } catch {}
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="How to play"
        className="fixed right-4 top-[calc(4.25rem+env(safe-area-inset-top))] z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0A0A0D]/70 text-sm font-semibold text-white/60 backdrop-blur transition-colors hover:text-white"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/10 bg-[#121216] sm:rounded-3xl"
          >
            <div className="flex items-start justify-between px-6 pt-6 pb-3">
              <h2 className={`${display} text-3xl text-white`}>{title}</h2>
              <button onClick={close} aria-label="Close" className="-mr-2 p-2 text-white/40 hover:text-white">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-2">
              {sections.map((s) => (
                <section key={s.title}>
                  <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[#E8C67A]">{s.title}</p>
                  <ul className="space-y-2.5">
                    {s.steps.map((step) => (
                      <li key={step} className="flex gap-3 text-[15px] leading-relaxed text-white/75">
                        <span className="mt-[0.6rem] h-1 w-1 shrink-0 rounded-full bg-white/35" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <div className="p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <Button full onClick={close}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
