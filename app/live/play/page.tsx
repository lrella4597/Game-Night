"use client";

import { Suspense } from "react";
import PlayerJoinForm from "@/app/components/live/player/PlayerJoinForm";
import Link from "next/link";

export default function PlayerJoinPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-[#FFD700] mb-2 text-center">
        Join Game
      </h1>
      <p className="text-blue-200 mb-8 text-center">
        Enter the code shown on the host&apos;s screen
      </p>

      <Suspense fallback={<div className="text-blue-200">Loading...</div>}>
        <PlayerJoinForm />
      </Suspense>

      <Link
        href="/live"
        className="mt-8 text-blue-300 hover:text-white transition-colors text-sm"
      >
        Back
      </Link>
    </div>
  );
}
