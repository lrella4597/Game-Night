"use client";

import { useEffect, useMemo, useState } from "react";
import {
  readAudienceSnapshot,
  TRIVIA_AUDIENCE_CHANNEL,
  TRIVIA_AUDIENCE_STORAGE_KEY,
  type TriviaAudienceSnapshot,
} from "@/lib/audience/triviaAudience";

export default function AudienceDisplay() {
  const [snapshot, setSnapshot] = useState<TriviaAudienceSnapshot | null>(null);
  const usedQuestionIds = useMemo(
    () => new Set(snapshot?.usedQuestionIds ?? []),
    [snapshot?.usedQuestionIds]
  );

  useEffect(() => {
    const initialSnapshotTimer = window.setTimeout(() => {
      setSnapshot(readAudienceSnapshot());
    }, 0);

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== TRIVIA_AUDIENCE_STORAGE_KEY || !event.newValue) return;
      try {
        setSnapshot(JSON.parse(event.newValue) as TriviaAudienceSnapshot);
      } catch {
        // Ignore malformed browser storage and wait for the next host update.
      }
    };

    window.addEventListener("storage", handleStorage);

    if (typeof BroadcastChannel === "undefined") {
      return () => {
        window.clearTimeout(initialSnapshotTimer);
        window.removeEventListener("storage", handleStorage);
      };
    }

    const channel = new BroadcastChannel(TRIVIA_AUDIENCE_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string; snapshot?: TriviaAudienceSnapshot }>) => {
      if (event.data?.type === "snapshot" && event.data.snapshot) {
        setSnapshot(event.data.snapshot);
      }
    };

    return () => {
      window.clearTimeout(initialSnapshotTimer);
      channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#050934] text-white flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Trivia Free-for-All</p>
          <h1 className="mt-4 text-4xl font-black">Waiting for the host</h1>
          <p className="mt-3 text-blue-100">Open Audience View from the host board.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050934] text-white p-4 md:p-8 flex flex-col">
      {snapshot.activeClue ? (
        <section className="flex-1 flex flex-col items-center justify-center text-center max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-yellow-300">
              {snapshot.activeClue.categoryTitle}
            </h1>
            <span className="rounded-xl border border-yellow-300/50 bg-yellow-300/10 px-4 py-2 text-2xl font-black text-yellow-300">
              {snapshot.activeClue.value}
            </span>
          </div>
          <p className="text-4xl md:text-6xl font-black leading-tight text-white">
            {snapshot.activeClue.clue}
          </p>
        </section>
      ) : (
        <section className="flex-1 flex flex-col min-h-0">
          <header className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-yellow-300">Trivia Free-for-All</p>
              <h1 className="text-3xl md:text-5xl font-black">Game Board</h1>
            </div>
            <p className="text-sm text-blue-100">Host controls are private</p>
          </header>

          <div
            aria-label="Audience trivia board"
            className="grid flex-1 gap-1 rounded-xl bg-black p-1"
            style={{ gridTemplateColumns: `repeat(${snapshot.board.columns.length}, minmax(0, 1fr))` }}
          >
            {snapshot.board.columns.map((column) => (
              <div
                key={column.id}
                className="flex min-h-[72px] items-center justify-center bg-[#1118d9] px-2 text-center text-sm md:text-lg font-black uppercase leading-tight"
              >
                {column.title}
              </div>
            ))}

            {snapshot.board.rowValues.flatMap((value) =>
              snapshot.board.columns.map((column) => {
                const question = column.questions.find((item) => item.value === value);
                const isUsed = question ? usedQuestionIds.has(question.id) : true;
                return (
                  <div
                    key={`${column.id}-${value}`}
                    className={`flex min-h-[92px] items-center justify-center text-3xl md:text-5xl font-black ${
                      isUsed ? "bg-[#070b62] text-transparent" : "bg-[#1118e9] text-yellow-300"
                    }`}
                  >
                    {isUsed ? "Used" : value}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {snapshot.teams.length > 0 && (
        <footer className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${snapshot.teams.length}, minmax(0, 1fr))` }}>
          {snapshot.teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center">
              <p className="truncate text-sm font-bold uppercase" style={{ color: team.color }}>{team.name}</p>
              <p className="text-3xl font-black text-white">{team.score}</p>
            </div>
          ))}
        </footer>
      )}
    </main>
  );
}
