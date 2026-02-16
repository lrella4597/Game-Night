"use client";

import { useState } from "react";
import GameBoard from "./components/GameBoard";
import CategoriesTab from "./components/CategoriesTab";
import SetupTab from "./components/SetupTab";
import FavoritesTab from "./components/FavoritesTab";
import PlayerStatsTab from "./components/PlayerStatsTab";
import ThemeSettingsTab from "./components/ThemeSettingsTab";
import SoundSettingsTab from "./components/SoundSettingsTab";
import KeyboardShortcutsTab from "./components/KeyboardShortcutsTab";
import ChatBoardBuilder from "./components/ChatBoardBuilder";
import DraftCategoriesTab from "./components/DraftCategoriesTab";
import UserHeader from "./components/auth/UserHeader";
import MigrationBanner from "./components/migration/MigrationBanner";
import WelcomeModal from "@/components/help/WelcomeModal";
import HelpModal from "@/components/help/HelpModal";
import { useKeyboardShortcuts } from "@/lib/keyboard/useKeyboardShortcuts";
import { useSoundEffects } from "@/lib/audio/useSoundEffects";

type Tab = "game" | "setup" | "categories" | "favorites" | "stats" | "theme" | "sound" | "shortcuts" | "chat" | "drafts";

const TABS: { id: Tab; label: string }[] = [
  { id: "game",       label: "Game" },
  { id: "setup",      label: "Setup" },
  { id: "chat",       label: "💬 Chat" },
  { id: "drafts",     label: "📋 Drafts" },
  { id: "categories", label: "Categories" },
  { id: "stats",      label: "Stats" },
  { id: "favorites",  label: "Favorites" },
  { id: "theme",      label: "Theme" },
  { id: "sound",      label: "Sound" },
  { id: "shortcuts",  label: "Shortcuts" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("game");
  const [showHelp, setShowHelp] = useState(false);
  const [soundToast, setSoundToast] = useState(false);
  const { enabled: soundEnabled, setEnabled: setSoundEnabled } = useSoundEffects();

  // Global keyboard shortcuts
  useKeyboardShortcuts(
    {
      onToggleSound: () => {
        setSoundEnabled(!soundEnabled);
        setSoundToast(true);
        setTimeout(() => setSoundToast(false), 2000);
      },
      onToggleHelp: () => setShowHelp(!showHelp),
      onEscape: () => setShowHelp(false),
    },
    true
  );

  return (
    <>
      <MigrationBanner />
      <WelcomeModal />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      <div className="min-h-screen w-full flex flex-col items-center py-8 px-4">
        {/* Header with title and user */}
        <div className="w-full max-w-7xl flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Game Night
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHelp(true)}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-2"
            title="Help & Guide"
          >
            ❓ Help
          </button>
          <UserHeader />
        </div>
      </div>

      {/* Pill-style tab navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 mb-8 flex gap-1 shadow-sm">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`
              px-5 py-2 rounded-xl font-medium text-sm tracking-tight transition-all
              ${activeTab === id
                ? "text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }
            `}
            style={{
              backgroundColor: activeTab === id ? "#D7FF2F" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "game"       && <GameBoard />}
      {activeTab === "setup"      && <SetupTab />}
      {activeTab === "chat"       && <ChatBoardBuilder />}
      {activeTab === "drafts"     && <DraftCategoriesTab />}
      {activeTab === "categories" && <CategoriesTab />}
      {activeTab === "stats"      && <PlayerStatsTab />}
      {activeTab === "favorites"  && <FavoritesTab />}
      {activeTab === "theme"      && <ThemeSettingsTab />}
      {activeTab === "sound"      && <SoundSettingsTab />}
      {activeTab === "shortcuts"  && <KeyboardShortcutsTab />}

      {/* Sound toggle toast */}
      {soundToast && (
        <div
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-lg z-50 flex items-center gap-2"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        >
          <span className="text-xl">{soundEnabled ? "🔊" : "🔇"}</span>
          <span>Sound {soundEnabled ? "On" : "Off"}</span>
        </div>
      )}
      </div>
    </>
  );
}
