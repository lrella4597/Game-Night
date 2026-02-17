"use client";
// Deployment test v3
import Link from "next/link";
import UserHeader from "@/app/components/auth/UserHeader";

export default function GameSelectPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center py-8 px-4">
      {/* User header */}
      <div className="fixed top-4 right-4 z-10">
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

        {/* Community Boards */}
        <Link
          href="/community"
          className="group rounded-2xl border border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f97316] to-[#ea580c] flex items-center justify-center text-3xl font-bold text-white shadow-sm">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 group-hover:text-slate-700">
            Community Boards
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Browse and share boards created by the community
          </p>
        </Link>
      </div>
    </div>
  );
}
