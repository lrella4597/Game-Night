"use client";

import Link from "next/link";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import CustomizeTodayChat from "./CustomizeTodayChat";
import PackEditor from "./PackEditor";
import type { MissionPackItem, EventPackItem } from "@/lib/chat/types";
import { Avatar, Button, Card, Eyebrow, Icon, Screen, Title, display } from "../ui";
import { GAME_SETTINGS, isGameSetting, settingPack } from "@/lib/day-of-deception/settings";
import type { GameSetting } from "@/lib/day-of-deception/settings";

interface DayHostLobbyProps {
  sessionId: string;
  players: {
    id: string;
    displayName: string;
    avatarColor: string;
    isConnected: boolean;
  }[];
  joinCode: string;
  config: {
    deceiverCount: number;
    missionCadence: string;
    numberOfEvents: number;
    discussionTimerMinutes: number;
    votingTimerSeconds: number;
    maxTokenVoteBonus: number;
    maxPlayers: number;
  };
  onStartGame: () => Promise<void>;
  onKickPlayer: (playerId: string) => Promise<void>;
}

export default function DayHostLobby({ sessionId, players, joinCode, config, onStartGame, onKickPlayer }: DayHostLobbyProps) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [missionPack, setMissionPack] = useState<MissionPackItem[] | null>(null);
  const [eventPack, setEventPack] = useState<EventPackItem[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [packApplied, setPackApplied] = useState(false);
  const [cadence, setCadence] = useState<string>(config.missionCadence);
  const [savingCadence, setSavingCadence] = useState(false);
  const [length, setLength] = useState<"day" | "weekend">("day");
  const [discussion, setDiscussion] = useState(config.discussionTimerMinutes);
  // Where the game is being played. Has to be picked before starting.
  const [setting, setSetting] = useState<GameSetting | null>(null);
  const [savingSetting, setSavingSetting] = useState(false);
  // Whether Traitors are told who the other Traitors are
  const [traitorsKnown, setTraitorsKnown] = useState(true);
  const [knownError, setKnownError] = useState(false);

  // Load the saved length (older databases don't have the column: stays "day")
  useEffect(() => {
    createClient()
      .from("traitors_day_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => {
        if (data?.game_length === "weekend") setLength("weekend");
        if (data?.traitors_know_each_other === false) setTraitorsKnown(false);
        const saved = (data?.context_summary as { setting?: string } | null)?.setting;
        if (isGameSetting(saved)) setSetting(saved);
        // A custom pack written earlier (Customize Today) stays in charge
        const firstId = Array.isArray(data?.mission_pack) ? String(data.mission_pack[0]?.id ?? "") : null;
        if (firstId !== null && !/^(out|event)-m/.test(firstId)) setPackApplied(true);
      });
  }, [sessionId]);

  // One day or a weekend. Sets sensible mission timing and Roundtable length.
  async function handleLengthChange(value: "day" | "weekend") {
    const preset = value === "weekend" ? { cadence: "60", discussion: 20 } : { cadence: "30", discussion: 15 };
    const prev = { length, cadence, discussion };
    setLength(value);
    setCadence(preset.cadence);
    setDiscussion(preset.discussion);
    const { error } = await createClient()
      .from("traitors_day_sessions")
      .update({ game_length: value, mission_cadence: preset.cadence, discussion_timer_minutes: preset.discussion })
      .eq("id", sessionId);
    if (error) {
      setLength(prev.length);
      setCadence(prev.cadence);
      setDiscussion(prev.discussion);
    }
  }

  // Where you're playing picks the missions and events, unless Customize
  // Today already wrote a pack for this game.
  async function handleSettingChange(value: GameSetting) {
    const previous = setting;
    setSetting(value);
    setSavingSetting(true);
    try {
      const pack = settingPack(value);
      const res = await fetch("/api/day-of-deception/save-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ...(packApplied ? { keepPack: true } : { missionPack: pack?.missions ?? null, eventPack: pack?.events ?? null }),
          contextSummary: { theme: "", setting: value, conversationHistory: "" },
        }),
      });
      if (!res.ok) setSetting(previous);
    } catch {
      setSetting(previous);
    } finally {
      setSavingSetting(false);
    }
  }

  async function handleTraitorsKnownChange(value: boolean) {
    const previous = traitorsKnown;
    setTraitorsKnown(value);
    setKnownError(false);
    const { error } = await createClient()
      .from("traitors_day_sessions")
      .update({ traitors_know_each_other: value })
      .eq("id", sessionId);
    if (error) {
      setTraitorsKnown(previous);
      setKnownError(true);
    }
  }

  // How often the server automatically sends Traitors a new mission
  async function handleCadenceChange(value: string) {
    const previous = cadence;
    setCadence(value);
    setSavingCadence(true);
    const { error } = await createClient()
      .from("traitors_day_sessions")
      .update({ mission_cadence: value })
      .eq("id", sessionId);
    if (error) setCadence(previous);
    setSavingCadence(false);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const fallback = `${origin}/day-of-deception/play?code=${joinCode}`;
    const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (!isLocal) {
      setJoinUrl(fallback);
      return;
    }
    fetch("/api/live/network-ip")
      .then((r) => r.json())
      .then((data) =>
        setJoinUrl(data.ip ? `http://${data.ip}:${window.location.port}/day-of-deception/play?code=${joinCode}` : fallback)
      )
      .catch(() => setJoinUrl(fallback));
  }, [joinCode]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      await onStartGame();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Couldn't start. Try again.");
      setStarting(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const canStart = players.length >= 1 && setting !== null && !savingSetting;
  const settings: [string, string][] = [
    ["Traitors", String(config.deceiverCount)],
    ["Discussion", `${discussion} min`],
    ["Voting", `${config.votingTimerSeconds} sec`],
    ["Max players", String(config.maxPlayers)],
  ];

  return (
    <Screen wide>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        {/* Join */}
        <div className="text-center lg:text-left">
          <Eyebrow>Lobby</Eyebrow>
          <Title size="xl" className="mt-3">
            Scan to join.
          </Title>
          <p className="mt-4 text-[15px] text-white/50">
            Already have the app? Open it and type the code.
          </p>

          <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row lg:items-center">
            {joinUrl && (
              <div className="rounded-3xl bg-white p-4 shadow-[0_20px_60px_-20px_rgba(232,198,122,0.35)]">
                <QRCodeSVG value={joinUrl} size={176} fgColor="#0A0A0D" bgColor="#ffffff" level="M" />
              </div>
            )}
            <div className="text-center sm:text-left">
              <Eyebrow>Game code</Eyebrow>
              <button
                onClick={handleCopyCode}
                className="mt-2 font-mono text-5xl font-semibold tracking-[0.18em] text-[#E8C67A] transition-colors hover:text-[#F1D597]"
                title="Copy code"
              >
                {joinCode}
              </button>
              <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/40 sm:justify-start">
                <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Tap to copy"}
              </p>
            </div>
          </div>

          <Link
            href={`/day-of-deception/play?code=${encodeURIComponent(joinCode)}`}
            className="mt-8 flex items-center gap-3 rounded-2xl border border-[#E8C67A]/25 bg-[#E8C67A]/[0.06] px-4 py-3.5 text-left transition-colors hover:bg-[#E8C67A]/[0.1]"
          >
            <Icon name="users" className="h-5 w-5 shrink-0 text-[#E8C67A]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-white">Playing too? Join as a player</span>
              <span className="mt-0.5 block text-xs text-white/50">
                Your player screen gets a Host button, so you can run the whole game from one phone.
              </span>
            </span>
            <Icon name="arrow" className="h-4 w-4 text-[#E8C67A]" />
          </Link>
        </div>

        {/* Players + settings */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-baseline justify-between">
              <h2 className={`${display} text-2xl text-white`}>Players</h2>
              <span className="text-sm tabular-nums text-white/40">
                {players.length} / {config.maxPlayers}
              </span>
            </div>
            {players.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-[15px] text-white/55">Waiting for people to join</p>
                <p className="mt-1 text-sm text-white/30">They&apos;ll show up here live.</p>
              </div>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="group flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] py-2 pl-2 pr-1.5"
                  >
                    <Avatar name={p.displayName} color={p.avatarColor} size="sm" dim={!p.isConnected} />
                    <span className="flex-1 truncate text-sm text-white/85">{p.displayName}</span>
                    <button
                      onClick={() => onKickPlayer(p.id)}
                      className="rounded-full p-1.5 text-white/25 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                      title={`Remove ${p.displayName}`}
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className={`${display} text-2xl text-white`}>Where are you playing?</h2>
            <p className="mt-1 text-sm text-white/50">Missions and events are picked to fit the place.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {GAME_SETTINGS.map((s) => (
                <button
                  key={s.key}
                  disabled={savingSetting}
                  onClick={() => handleSettingChange(s.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    setting === s.key ? "border-[#E8C67A]/60 bg-[#E8C67A]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-[15px] font-medium text-white">{s.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-white/50">{s.blurb}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className={`${display} text-2xl text-white`}>Settings</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(
                [
                  ["day", "One day", "About 3 Roundtables, midday to evening. Murder starts as soon as the day does."],
                  ["weekend", "Weekend", "Friday to Sunday, about 2 Roundtables a day. Pause overnight with Good night."],
                ] as const
              ).map(([value, label, blurb]) => (
                <button
                  key={value}
                  onClick={() => handleLengthChange(value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    length === value ? "border-[#E8C67A]/60 bg-[#E8C67A]/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="block text-[15px] font-medium text-white">{label}</span>
                  <span className="mt-1 block text-xs leading-snug text-white/50">{blurb}</span>
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center justify-between gap-4">
              <span>
                <span className="block text-[15px] text-white/85">Traitors know each other</span>
                <span className="block text-xs text-white/40">
                  {knownError
                    ? "Couldn't save. The database needs its latest update first."
                    : traitorsKnown
                      ? "They see who the other Traitors are"
                      : "Each Traitor only knows their own role"}
                </span>
              </span>
              <select
                value={traitorsKnown ? "yes" : "no"}
                onChange={(e) => handleTraitorsKnownChange(e.target.value === "yes")}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#E8C67A]/50 focus:outline-none"
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label className="mt-4 flex items-center justify-between gap-4">
              <span>
                <span className="block text-[15px] text-white/85">Automatic missions</span>
                <span className="block text-xs text-white/40">Sent to Traitors all day</span>
              </span>
              <select
                value={cadence}
                disabled={savingCadence}
                onChange={(e) => handleCadenceChange(e.target.value)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-[#E8C67A]/50 focus:outline-none"
              >
                <option value="manual">Off</option>
                <option value="30">Every 30 min</option>
                <option value="45">Every 45 min</option>
                <option value="60">Every hour</option>
              </select>
            </label>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
              {settings.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-[0.16em] text-white/35">{k}</dt>
                  <dd className="mt-0.5 text-[15px] text-white/85">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {!showCustomize && !missionPack && (
            <button
              onClick={() => setShowCustomize(true)}
              className="flex w-full items-center gap-4 rounded-2xl border border-[#E8C67A]/25 bg-[#E8C67A]/[0.06] p-5 text-left transition-colors hover:bg-[#E8C67A]/[0.1]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8C67A]/15 text-[#E8C67A]">
                <Icon name="spark" className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className={`${display} block text-2xl text-white`}>Customize today</span>
                <span className="block text-sm text-white/50">
                  Tell the AI about the group and the place. It writes missions and events just for you.
                </span>
              </span>
              <Icon name="arrow" className="h-5 w-5 text-white/40" />
            </button>
          )}
          {packApplied && (
            <p className="flex items-center gap-2 text-sm text-emerald-300">
              <Icon name="check" className="h-4 w-4" /> Your custom missions and events are saved.
            </p>
          )}
        </div>
      </div>

      {showCustomize && !missionPack && (
        <div className="mt-10">
          <CustomizeTodayChat
            sessionId={sessionId}
            settingHint={GAME_SETTINGS.find((s) => s.key === setting)?.aiHint}
            onPackGenerated={(missions, events) => {
              setMissionPack(missions);
              setEventPack(events);
            }}
            onClose={() => setShowCustomize(false)}
          />
        </div>
      )}

      {missionPack && eventPack && (
        <div className="mt-10">
          <PackEditor
            missionPack={missionPack}
            eventPack={eventPack}
            onMissionPackChange={setMissionPack}
            onEventPackChange={setEventPack}
            onApply={async () => {
              setApplying(true);
              try {
                const res = await fetch("/api/day-of-deception/save-pack", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionId,
                    missionPack,
                    eventPack,
                    contextSummary: { theme: "", setting: setting ?? "", conversationHistory: "" },
                  }),
                });
                if (res.ok) setPackApplied(true);
              } finally {
                setApplying(false);
              }
            }}
            applying={applying}
          />
        </div>
      )}

      {/* Start bar */}
      <div className="sticky bottom-0 z-20 -mx-5 mt-12 border-t border-white/[0.06] bg-[#0A0A0D]/85 px-5 py-4 backdrop-blur-xl md:-mx-8 md:px-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/45">
            {startError ? (
              <span className="text-rose-300">{startError}</span>
            ) : canStart ? (
              `${players.length} player${players.length !== 1 ? "s" : ""} ready. Roles are dealt the moment you start.`
            ) : players.length < 1 ? (
              "Need at least 1 player to start."
            ) : (
              "Pick where you're playing to start."
            )}
          </p>
          <Button size="lg" onClick={handleStart} disabled={!canStart || starting} className="min-w-48">
            {starting ? "Dealing roles" : "Start the game"}
          </Button>
        </div>
      </div>
    </Screen>
  );
}
