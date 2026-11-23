"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GolfGame from "./GolfGame";
import { isValidDate, todayEastern } from "@/lib/golf/course";
import { parseToPar } from "@/lib/golf/shot";

function GolfFromParams() {
  const params = useSearchParams();
  const d = params.get("d");
  const date = isValidDate(d) ? d : todayEastern();
  const beat = parseToPar(params.get("beat"));
  const by = (params.get("by") || "").slice(0, 40).trim();
  const challenge = beat != null ? { toPar: beat, by: by || "A friend" } : null;
  // Remount on a new course/challenge so state starts clean.
  return <GolfGame key={`${date}|${beat}|${by}`} date={date} challenge={challenge} />;
}

export default function GolfPage() {
  return (
    <Suspense fallback={<div className="h-[100dvh] bg-[#14321f]" />}>
      <GolfFromParams />
    </Suspense>
  );
}
