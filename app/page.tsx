"use client";
// Deployment test v4
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import UserHeader from "@/app/components/auth/UserHeader";

function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const authError = searchParams.get("auth_error");
  if (!authError) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <p className="text-red-800 text-sm font-semibold">Sign-in failed</p>
        <p className="text-red-600 text-xs mt-1">{decodeURIComponent(authError)}</p>
      </div>
    </div>
  );
}

export default function GameSelectPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-8 px-4">
      <Suspense>
        <AuthErrorBanner />
      </Suspense>

      {/* Top-right header area */}
      <div className="fixed top-4 right-4 z-10 flex items-center gap-3">
        <Link
          href="/community"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Community Boards
        </Link>
        <UserHeader />
      </div>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-2 text-center">
        Welcome to Game Night
      </h1>
      <p className="text-lg text-slate-500 mb-12 text-center">
        Choose a game mode to get started
      </p>

      {/* Game mode tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Trivia Free-for-All */}
        <Link
          href="/trivia"
          className="group rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D7FF2F] to-[#b8e600] flex items-center justify-center text-3xl font-bold text-slate-800 shadow-sm">
            ?
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">
            Trivia Free-for-All
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Build boards with AI, practice solo, and master your categories
          </p>
        </Link>

        {/* Classic Jeopardy Live */}
        <Link
          href="/live"
          className="group rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#060CE9] to-[#3b3ff0] flex items-center justify-center text-3xl font-bold text-white shadow-sm">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">
            Classic Jeopardy Live
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Host or join a multiplayer game with friends
          </p>
        </Link>

        {/* Day of Deception */}
        <Link
          href="/day-of-deception"
          className="group rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dc2626] to-[#991b1b] flex items-center justify-center text-white shadow-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {/* Dagger blade */}
              <path d="M12 2L14.5 10H9.5L12 2Z" fill="currentColor" stroke="none" />
              {/* Blade center line */}
              <path d="M12 2v10" />
              {/* Crossguard */}
              <path d="M7 12h10" strokeWidth="2.5" />
              {/* Grip */}
              <path d="M12 12v8" strokeWidth="2" />
              {/* Pommel */}
              <circle cx="12" cy="21" r="1" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">
            Day of Deception
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            All-day social deduction with missions and a final roundtable vote
          </p>
        </Link>
      </div>
    </div>
  );
}
