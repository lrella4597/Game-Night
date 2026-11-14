"use client";

import React, { useEffect, useState } from "react";
import { Avatar, Button, Card, Eyebrow, Icon, display } from "../ui";
import { TraitorMissions } from "./DayPlayerFreeplay";
import type { DayMission } from "@/lib/day-of-deception/types";

export interface SecretMurder {
  status: string | null;
  method?: string | null;
  chosenName?: string | null;
  byName?: string | null;
}

export interface SecretExtras {
  // Anyone: double votes and truth checks won in events (Traitors also earn
  // a double vote every 3 missions)
  daggers?: number;
  daggerArmed?: boolean;
  truthChecks?: number;
  // Traitors after a Traitor is banished: offer someone a place
  recruit?: { status: string | null; targetName: string | null } | null;
  // Anyone: the Traitors want you
  recruitOffer?: boolean;
  // A Traitor in a game where Traitors aren't told who each other are
  blind?: boolean;
}

interface PlayerLite {
  id: string;
  displayName: string;
  avatarColor: string;
  eliminated?: string | null;
  shield?: boolean;
}

interface Props {
  sessionId: string;
  playerId: string;
  playerToken: string;
  role: "traitor" | "faithful" | null;
  fellowTraitors: { id: string; displayName: string; eliminated?: string | null }[];
  missions: DayMission[];
  murder: SecretMurder;
  extras: SecretExtras;
  players: PlayerLite[];
  eliminated: string | null;
  onCompleteMission: (missionId: string) => Promise<void>;
  onAction: (action: string, extra?: Record<string, unknown>) => Promise<unknown>;
}

// Closes by itself so a phone left on the table doesn't give anyone away
const AUTO_HIDE_MS = 30_000;

/**
 * Your role and everything secret, behind one button that looks the same for
 * every player. Nothing role-specific is ever on the main screen.
 */
export default function DayPlayerSecrets(props: Props) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(0);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    const hide = () => {
      if (document.visibilityState !== "visible") setOpen(false);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [open, touched]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06]"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70">
          <Icon name="lock" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-white">My secret</span>
          <span className="block text-xs text-white/45">Your role and anything only you should see. Check nobody&apos;s looking.</span>
        </span>
        <Icon name="arrow" className="h-4 w-4 text-white/40" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0D]"
          onPointerDown={() => setTouched((n) => n + 1)}
        >
          <div className="mx-auto max-w-md px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between">
              <Eyebrow>My secret</Eyebrow>
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
                Hide
              </Button>
            </div>
            <SecretBody {...props} />
            <p className="mt-8 text-center text-[11px] text-white/30">Hides by itself after 30 seconds.</p>
          </div>
        </div>
      )}
    </>
  );
}

function SecretBody({
  playerId,
  role,
  fellowTraitors,
  missions,
  murder,
  extras,
  players,
  eliminated,
  onCompleteMission,
  onAction,
}: Props) {
  const isTraitor = role === "traitor";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truthPicks, setTruthPicks] = useState<string[]>([]);
  const [truthResult, setTruthResult] = useState<string | null>(null);

  async function act(action: string, extra?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = (await onAction(action, extra)) as { text?: string } | undefined;
      if (action === "truth_check" && res?.text) {
        setTruthResult(res.text);
        setTruthPicks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Try again");
    } finally {
      setBusy(false);
    }
  }

  const traitorIds = [playerId, ...fellowTraitors.map((t) => t.id)];
  const faithfulTargets = players.filter(
    (p) => !p.eliminated && !p.shield && !traitorIds.includes(p.id)
  );

  return (
    <div className="mt-6 space-y-5">
      <div className="text-center">
        <span
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isTraitor ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          <Icon name={isTraitor ? "dagger" : "shield"} className="h-7 w-7" />
        </span>
        <h2 className={`${display} mt-4 text-4xl ${isTraitor ? "text-rose-200" : "text-emerald-200"}`}>
          {isTraitor ? "You are a Traitor" : "You are Faithful"}
        </h2>
        {isTraitor && fellowTraitors.length > 0 && (
          <p className="mt-2 text-sm text-white/55">
            With{" "}
            {fellowTraitors
              .map((t) => `${t.displayName}${t.eliminated ? ` (${t.eliminated})` : ""}`)
              .join(", ")}
          </p>
        )}
        {isTraitor && extras.blind && (
          <p className="mt-2 text-sm text-white/55">You don&apos;t know who the other Traitors are. Work it out.</p>
        )}
        {eliminated && <p className="mt-2 text-sm text-white/45">You&apos;re out of the game.</p>}
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      {/* The Traitors want you */}
      {extras.recruitOffer && !isTraitor && !eliminated && (
        <Card tone="deceiver" className="p-5">
          <Eyebrow className="!text-rose-300/90">An offer</Eyebrow>
          <p className="mt-3 text-[17px] leading-snug text-white">The Traitors want you to join them.</p>
          <p className="mt-2 text-sm text-white/55">
            Say yes and you become a Traitor from now on. Say no and you stay Faithful, but they&apos;ll know you
            turned them down.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="danger" disabled={busy} onClick={() => act("recruit_answer", { targetId: "yes" })}>
              Join them
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => act("recruit_answer", { targetId: "no" })}>
              Stay Faithful
            </Button>
          </div>
        </Card>
      )}

      {!isTraitor && !extras.recruitOffer && (
        <Card className="p-5">
          <p className="text-[15px] leading-relaxed text-white/70">
            No missions for you. Read your clues, then watch who does those things. Trust carefully.
          </p>
        </Card>
      )}

      {isTraitor && !eliminated && (
        <>
          {/* Murder in plain sight */}
          {(murder.status === "open" || murder.status === "chosen") && (
            <Card tone="deceiver" className="p-5">
              <div className="flex items-center gap-2">
                <Icon name="dagger" className="h-4 w-4 text-rose-300" />
                <Eyebrow className="!text-rose-300/90">Murder in plain sight</Eyebrow>
              </div>
              {murder.status === "chosen" ? (
                <p className="mt-3 text-[15px] text-white">
                  Done: {murder.byName ?? "a Traitor"} got <span className="font-semibold">{murder.chosenName}</span>. It&apos;s
                  revealed at breakfast. Act surprised.
                </p>
              ) : (
                <>
                  <p className="mt-3 text-[17px] leading-snug text-white">&ldquo;{murder.method}&rdquo;</p>
                  <p className="mt-2 text-sm text-white/55">
                    {extras.blind
                      ? "Any Traitor can do it, to any player without a shield. Pick another Traitor by mistake and the murder fails. In front of everyone, casually. Then tap who you got."
                      : "Any Traitor can do it, to any Faithful player without a shield. In front of everyone, casually. Then tap who you got."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {faithfulTargets.map((p) => (
                      <button
                        key={p.id}
                        disabled={busy}
                        onClick={() => act("murder_pick", { targetId: p.id })}
                        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm text-white/80 hover:border-rose-300/50"
                      >
                        <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                        {p.displayName}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => act("murder_reroll")}
                    className="mt-3 text-xs text-white/40 hover:text-white/70"
                  >
                    Won&apos;t work here? Get a different method
                  </button>
                </>
              )}
            </Card>
          )}

          {/* Recruit after a Traitor is banished */}
          {extras.recruit?.status === "open" && (
            <Card tone="deceiver" className="p-5">
              <Eyebrow className="!text-rose-300/90">Recruit</Eyebrow>
              <p className="mt-3 text-[15px] text-white/80">
                You lost a Traitor. Offer a Faithful player a place. They can say no.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {faithfulTargets.map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    onClick={() => act("recruit_offer", { targetId: p.id })}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-sm text-white/80 hover:border-rose-300/50"
                  >
                    <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                    {p.displayName}
                  </button>
                ))}
              </div>
            </Card>
          )}
          {extras.recruit?.status === "offered" && (
            <Card tone="deceiver" className="p-4 text-sm text-white/70">
              Offer sent to {extras.recruit.targetName}. Waiting for their answer.
            </Card>
          )}

          <div>
            <Eyebrow className="mb-3 !text-rose-300/80">Your missions</Eyebrow>
            <TraitorMissions missions={missions} onCompleteMission={onCompleteMission} />
          </div>
        </>
      )}

      {!eliminated && (extras.daggers ?? 0) > 0 && (
        <Card tone="gold" className="p-5">
          <Eyebrow className="!text-[#E8C67A]">Double vote · {extras.daggers}</Eyebrow>
          <p className="mt-2 text-sm text-white/60">
            Arm it and your vote counts twice at the next Roundtable. Everyone sees it when the votes are shown.
          </p>
          <Button
            size="sm"
            className="mt-3"
            variant={extras.daggerArmed ? "secondary" : "primary"}
            disabled={busy}
            onClick={() => act("dagger", { targetId: extras.daggerArmed ? "off" : "on" })}
          >
            {extras.daggerArmed ? "Armed for the next vote. Tap to save it" : "Arm it for the next vote"}
          </Button>
        </Card>
      )}

      {!eliminated && ((extras.truthChecks ?? 0) > 0 || truthResult) && (
        <Card tone="gold" className="p-5">
          <Eyebrow className="!text-[#E8C67A]">Truth check{(extras.truthChecks ?? 0) > 1 ? ` · ${extras.truthChecks}` : ""}</Eyebrow>
          {truthResult ? (
            <p className="mt-3 text-[16px] leading-snug text-white">{truthResult}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-white/60">
                Pick two players. You&apos;ll learn if at least one of them is a Traitor. Only you see the answer.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {players
                  .filter((p) => !p.eliminated && p.id !== playerId)
                  .map((p) => {
                    const on = truthPicks.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          setTruthPicks((t) => (on ? t.filter((x) => x !== p.id) : t.length < 2 ? [...t, p.id] : t))
                        }
                        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${
                          on ? "border-[#E8C67A]/70 bg-[#E8C67A]/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70"
                        }`}
                      >
                        <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                        {p.displayName}
                      </button>
                    );
                  })}
              </div>
              <Button
                full
                className="mt-4"
                disabled={busy || truthPicks.length !== 2}
                onClick={() => act("truth_check", { targetId: truthPicks.join(",") })}
              >
                Check these two
              </Button>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
