"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDayHostControls } from "@/lib/day-of-deception/useHostControls";
import { useGameChanges } from "@/lib/day-of-deception/useGameChanges";
import { DAY_HOST_EVENTS } from "@/lib/day-of-deception/channelEvents";
import { Avatar, Button, Card, Eyebrow, Icon, Pill, formatTime } from "../ui";
import { formatClueText } from "@/lib/day-of-deception/clueText";

interface HostState {
  phase: string;
  round: number;
  gameLength: "day" | "weekend";
  paused: boolean;
  joinCode: string;
  settingChosen: boolean;
  eventNames: string[];
  currentEvent: string | null;
  timerEndsAt: number | null;
  players: { id: string; displayName: string; avatarColor: string; eliminated: string | null; shield: boolean }[];
  choosing: string[];
  votesIn: number;
  voters: number;
  reveal: {
    step: "boards" | "tie" | "banished" | "role" | "endgame";
    accusedName: string | null;
    accusedRole: string | null;
    tally: { name: string; votes: number }[];
  } | null;
  murder: { status: string | null; victimName: string | null; done: number };
  breakfastWaiting: number | null;
  endgame: { voted: number; voters: number } | null;
  recruiting: boolean;
  murderThisRound: boolean;
  winner: string | null;
  roles: { displayName: string; role: string; eliminated: string | null }[] | null;
}

interface HostPanelProps {
  sessionId: string;
  broadcast: (event: string, payload: unknown) => void;
  // "sheet": a Host button on the host's own player screen. "inline": the host page.
  mode: "sheet" | "inline";
  // The host's own player id, so they can pick themselves as a winner
  myPlayerId?: string | null;
}

type Reward = "clue" | "choice" | "dagger" | "truth";

// What an event is worth. Mix them up through the day.
const REWARDS: { value: Reward; label: string; blurb: string }[] = [
  { value: "clue", label: "Private clue", blurb: "Each winner gets a clue only they see." },
  {
    value: "choice",
    label: "Shield or team clue",
    blurb: "Each winner chooses: the shield for themselves, or a clue for everyone. Everyone sees which.",
  },
  {
    value: "dagger",
    label: "Double vote",
    blurb: "Each winner gets a secret double vote to use at a Roundtable. Great for a solo challenge.",
  },
  {
    value: "truth",
    label: "Truth check",
    blurb: "Each winner picks two players and learns if a Traitor is among them. Strong: save it for a big challenge.",
  },
];

function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return endsAt ? Math.max(0, Math.round((endsAt - now) / 1000)) : null;
}

/**
 * Everything the host does, in one place, spoiler-free. Runs from the host
 * page or as a sheet on the host's own player screen, so one phone can host
 * and play.
 */
export default function HostPanel({ sessionId, broadcast, mode, myPlayerId }: HostPanelProps) {
  const controls = useDayHostControls({ sessionId, broadcast });
  const [state, setState] = useState<HostState | null>(null);
  const [open, setOpen] = useState(mode === "inline");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winners, setWinners] = useState<string[]>([]);
  const [reward, setReward] = useState<Reward>("clue");
  const [showEvents, setShowEvents] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/day-of-deception/host-state?sessionId=${sessionId}`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      // Next change or poll will retry
    }
  }, [sessionId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);
  useGameChanges(sessionId, () => load());

  const remaining = useCountdown(state?.timerEndsAt ?? null);

  async function run(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!state) {
    return mode === "inline" ? <Card className="py-6 text-center text-sm text-white/40">Loading controls</Card> : null;
  }

  const living = state.players.filter((p) => !p.eliminated);
  const b = (key: string) => busy === key;

  const body = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Eyebrow className="!text-[#E8C67A]">Host controls</Eyebrow>
        <span className="text-xs text-white/40">
          Code <span className="font-mono tracking-widest text-white/70">{state.joinCode}</span>
          {state.phase !== "lobby" && ` · Round ${state.round} of about ${state.gameLength === "weekend" ? 6 : 3}`}
        </span>
      </div>

      {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      {state.choosing.length > 0 && (
        <p className="rounded-xl bg-[#E8C67A]/10 px-3 py-2 text-sm text-[#E8C67A]">
          Waiting on {state.choosing.join(", ")} to choose: shield or team clue.
        </p>
      )}
      {state.players.some((p) => p.shield && !p.eliminated) && (
        <p className="text-xs text-white/50">
          🛡️ Shield: {state.players.filter((p) => p.shield && !p.eliminated).map((p) => p.displayName).join(", ")}
        </p>
      )}

      {state.phase === "lobby" && (
        <Card className="p-4">
          <p className="text-[15px] text-white">{state.players.length} joined</p>
          <p className="mt-1 text-xs text-white/45">Everyone has to join before you start. Roles are dealt the moment you tap.</p>
          {state.settingChosen ? (
            <Button full className="mt-4" disabled={b("start") || state.players.length < 2} onClick={() => run("start", controls.startGame)}>
              {b("start") ? "Dealing roles" : "Start the game"}
            </Button>
          ) : (
            <p className="mt-4 rounded-xl bg-[#E8C67A]/10 px-3 py-2 text-sm text-[#E8C67A]">
              Pick where you&apos;re playing first. It&apos;s on the setup screen below.
            </p>
          )}
          <Link
            href={`/day-of-deception/host/${sessionId}`}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-white/10 text-sm font-medium text-white/75 hover:text-white"
          >
            Setup: QR code, where you&apos;re playing, Customize Today
          </Link>
        </Card>
      )}

      {state.phase === "roles_revealed" && (
        <Card className="p-4">
          <p className="text-[15px] text-white">Roles are out. Give everyone a minute to look.</p>
          <p className="mt-1 text-xs text-white/45">The first murder starts as soon as the day does.</p>
          <Button
            full
            className="mt-4"
            disabled={b("day")}
            onClick={() =>
              run("day", async () => {
                await controls.beginDay();
                // Every round has a murder, the first one included
                await controls.hostAction("murder_open").catch(() => {});
              })
            }
          >
            Begin the day
          </Button>
        </Card>
      )}

      {(state.phase === "freeplay" || state.phase === "event_active") && (
        <>
          {state.phase === "freeplay" ? (
            <Card className="p-4">
              <p className="text-[15px] font-medium text-white">Event</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" disabled={b("event")} onClick={() => run("event", () => controls.startEvent())}>
                  Random event
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowEvents((s) => !s)}>
                  Choose one
                </Button>
              </div>
              {showEvents && (
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {state.eventNames.map((n) => (
                    <button
                      key={n}
                      disabled={b("event")}
                      onClick={() => {
                        setShowEvents(false);
                        run("event", () => controls.startEvent(n));
                      }}
                      className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-left text-sm text-white/80 hover:bg-white/[0.08]"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card tone="gold" className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[15px] font-medium text-white">{state.currentEvent ?? "Event"}</p>
                {remaining !== null && <Pill>{formatTime(remaining)}</Pill>}
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-white/40">Winners get</p>
              <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-black/30 p-1">
                {REWARDS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReward(r.value)}
                    className={`rounded-lg px-2 py-2 text-sm font-medium ${reward === r.value ? "bg-white/10 text-white" : "text-white/45"}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/50">
                {REWARDS.find((r) => r.value === reward)?.blurb} Tap the winners (you can pick yourself), then finish.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {living.map((p) => {
                  const on = winners.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setWinners((w) => (on ? w.filter((x) => x !== p.id) : [...w, p.id]))}
                      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${
                        on ? "border-[#E8C67A]/70 bg-[#E8C67A]/20 text-white" : "border-white/10 bg-white/[0.04] text-white/70"
                      }`}
                    >
                      <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                      {p.id === myPlayerId ? "Me" : p.displayName}
                    </button>
                  );
                })}
              </div>
              <Button
                full
                className="mt-4"
                disabled={b("endEvent")}
                onClick={() =>
                  run("endEvent", async () => {
                    broadcast(DAY_HOST_EVENTS.TIMER_STOP, {});
                    await controls.endEvent(winners, reward);
                    setWinners([]);
                    setReward("clue");
                  })
                }
              >
                {winners.length > 0 ? `Finish · ${winners.length} winner${winners.length !== 1 ? "s" : ""}` : "Finish with no winner"}
              </Button>
            </Card>
          )}

          <Card tone="deceiver" className="p-4">
            <p className="text-[15px] font-medium text-white">Murder · one per round</p>
            {state.murder.status === "open" ? (
              <>
                <p className="mt-1 text-sm text-white/55">
                  The Traitors have their method and are doing it in plain sight. You&apos;ll see here when it&apos;s done.
                </p>
                <Button size="sm" variant="ghost" className="mt-2" disabled={b("mcancel")} onClick={() => run("mcancel", () => controls.hostAction("murder_cancel"))}>
                  Call it off this round
                </Button>
              </>
            ) : state.murder.status === "chosen" ? (
              <>
                <p className="mt-1 text-sm text-white/55">It&apos;s done. Call breakfast when everyone&apos;s together.</p>
                <Button full variant="danger" className="mt-3" disabled={b("bfast")} onClick={() => run("bfast", () => controls.hostAction("breakfast"))}>
                  ☕ Call breakfast
                </Button>
              </>
            ) : state.murder.status === "breakfast" || state.murder.status === "revealing" ? (
              <>
                <p className="mt-1 text-sm text-white/55">
                  Breakfast: waiting on {state.breakfastWaiting ?? 0} to check in. The victim is revealed once everyone has.
                </p>
                <Button size="sm" variant="ghost" className="mt-2" disabled={b("bnow")} onClick={() => run("bnow", () => controls.hostAction("breakfast_now"))}>
                  Reveal now
                </Button>
              </>
            ) : state.murderThisRound ? (
              <p className="mt-1 text-sm text-white/55">
                {state.murder.victimName ? `${state.murder.victimName} was murdered. ` : ""}That&apos;s this round&apos;s murder.
                The next one opens by itself after the Roundtable.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-white/55">
                  Open it whenever you like this round. The Traitors get a move to do to someone in plain sight, like
                  tossing them an apple. After round 1 it opens by itself.
                </p>
                <Button size="sm" variant="danger" className="mt-3" disabled={b("mopen")} onClick={() => run("mopen", () => controls.hostAction("murder_open"))}>
                  <Icon name="dagger" className="h-4 w-4" />
                  Open the murder
                </Button>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" disabled={b("mission")} onClick={() => run("mission", () => controls.sendMission())}>
                Send a mission
              </Button>
              {confirm === "roundtable" ? (
                <Button size="sm" variant="danger" disabled={b("rt")} onClick={() => run("rt", controls.startRoundtable)}>
                  Yes, Roundtable
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={state.phase !== "freeplay" || ["chosen", "breakfast", "revealing"].includes(state.murder.status ?? "")}
                  onClick={() => setConfirm("roundtable")}
                >
                  Roundtable
                </Button>
              )}
            </div>
            {confirm === "roundtable" && (
              <button onClick={() => setConfirm(null)} className="mt-2 text-xs text-white/40">
                Not yet
              </button>
            )}
          </Card>
        </>
      )}

      {state.gameLength === "weekend" && ["freeplay", "event_active"].includes(state.phase) && (
        <Card className="p-4">
          {state.paused ? (
            <>
              <p className="text-[15px] font-medium text-white">🌙 Paused for the night</p>
              <p className="mt-1 text-sm text-white/55">No missions, and open missions get their full time back in the morning.</p>
              <Button full className="mt-3" disabled={b("resume")} onClick={() => run("resume", () => controls.hostAction("resume"))}>
                ☀️ Good morning
              </Button>
            </>
          ) : (
            <>
              <p className="text-[15px] font-medium text-white">Overnight</p>
              <p className="mt-1 text-sm text-white/55">Going to bed? Pause so missions don&apos;t expire while everyone sleeps.</p>
              <Button size="sm" variant="secondary" className="mt-3" disabled={b("pause")} onClick={() => run("pause", () => controls.hostAction("pause"))}>
                🌙 Good night
              </Button>
            </>
          )}
        </Card>
      )}

      {state.phase === "roundtable" && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-medium text-white">Roundtable</p>
            {remaining !== null && <Pill>{formatTime(remaining)}</Pill>}
          </div>
          <p className="mt-1 text-sm text-white/55">Talk it out. When you&apos;re ready, everyone locks a vote on their phone.</p>
          <Button full className="mt-4" disabled={b("vote")} onClick={() => run("vote", controls.startVoting)}>
            Start the vote
          </Button>
        </Card>
      )}

      {state.phase === "voting" && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">
            {state.votesIn} of {state.voters} votes locked
          </p>
          <p className="mt-1 text-sm text-white/55">Nothing is shown yet. Next, everyone shows their own vote.</p>
          <Button full className="mt-4" disabled={b("close")} onClick={() => run("close", controls.resolveVote)}>
            {state.votesIn < state.voters ? "Close voting anyway" : "Close voting"}
          </Button>
        </Card>
      )}

      {state.reveal?.step === "boards" && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">Show the votes</p>
          <p className="mt-1 text-sm text-white/55">
            Go around the table. Each person holds up their phone, says who they voted for and why.
          </p>
          <Button full className="mt-4" disabled={b("count")} onClick={() => run("count", () => controls.hostAction("count"))}>
            Everyone&apos;s shown. Count them
          </Button>
        </Card>
      )}

      {state.reveal?.step === "tie" && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">It&apos;s a tie</p>
          <Tally tally={state.reveal.tally} />
          <Button full className="mt-4" disabled={b("revote")} onClick={() => run("revote", () => controls.hostAction("revote"))}>
            Vote again
          </Button>
        </Card>
      )}

      {state.reveal?.step === "banished" && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">{state.reveal.accusedName} is banished</p>
          <Tally tally={state.reveal.tally} />
          <p className="mt-3 text-sm text-white/55">
            Bring them up. They say their piece, then reveal on their own phone.
          </p>
          <button
            disabled={b("force")}
            onClick={() => run("force", () => controls.hostAction("force_role"))}
            className="mt-3 text-xs text-white/40 underline-offset-2 hover:underline"
          >
            Their phone died? Reveal it for them
          </button>
        </Card>
      )}

      {state.reveal?.step === "endgame" && state.endgame && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">The endgame</p>
          <p className="mt-1 text-sm text-white/55">
            Everyone votes on their phone: end the game, or banish again. It has to be unanimous to end. {state.endgame.voted}{" "}
            of {state.endgame.voters} voted.
          </p>
          <button
            disabled={b("eg")}
            onClick={() => run("eg", () => controls.hostAction("endgame_resolve"))}
            className="mt-3 text-xs text-white/40 underline-offset-2 hover:underline"
          >
            Someone can&apos;t vote? Settle it with the votes in
          </button>
        </Card>
      )}

      {state.recruiting && (
        <p className="text-xs text-white/45">The Traitors lost one and are recruiting. Nothing for you to do.</p>
      )}

      {state.reveal?.step === "role" && (
        <Card tone={state.reveal.accusedRole === "traitor" ? "deceiver" : "loyal"} className="p-4">
          <p className="text-[15px] font-medium text-white">
            {state.reveal.accusedName} was {state.reveal.accusedRole === "traitor" ? "a Traitor" : "Faithful"}.
          </p>
          <p className="mt-1 text-sm text-white/55">
            The game ends by itself if every Traitor is out, or the Traitors match the Faithful. With 4 or fewer left,
            the endgame vote starts instead. The next round&apos;s murder opens by itself.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => run("cont", () => controls.hostAction("continue", { next: "day" }))}>
              Back to the day
            </Button>
            <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => run("cont", () => controls.hostAction("continue", { next: "roundtable" }))}>
              Another Roundtable
            </Button>
          </div>
        </Card>
      )}

      {state.phase === "end" && <HostRecap sessionId={sessionId} />}

      {state.phase === "end" && (
        <Card className="p-4">
          <p className="text-[15px] font-medium text-white">
            {state.winner === "faithful" ? "The Faithful win." : "The Traitors win."}
          </p>
          {state.roles && (
            <ul className="mt-3 space-y-1 text-sm">
              {state.roles.map((r) => (
                <li key={r.displayName} className="flex justify-between text-white/70">
                  <span>
                    {r.displayName}
                    {r.eliminated && <span className="text-white/35"> · {r.eliminated}</span>}
                  </span>
                  <span className={r.role === "traitor" ? "text-rose-300" : "text-emerald-300"}>
                    {r.role === "traitor" ? "Traitor" : "Faithful"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!["lobby", "end"].includes(state.phase) && (
        <div className="pt-1 text-center">
          {confirm === "end" ? (
            <span className="text-xs text-white/50">
              End now? Traitors win if any are left.{" "}
              <button className="text-rose-300" disabled={b("end")} onClick={() => run("end", () => controls.hostAction("end"))}>
                End it
              </button>{" "}
              ·{" "}
              <button onClick={() => setConfirm(null)} className="text-white/60">
                Cancel
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirm("end")} className="text-xs text-white/30 hover:text-white/60">
              End the game now
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (mode === "inline") return body;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-[calc(7rem+env(safe-area-inset-top))] z-40 flex items-center gap-1.5 rounded-full border border-[#E8C67A]/40 bg-[#16161B]/90 px-3.5 py-2 text-sm font-semibold text-[#E8C67A] shadow-lg backdrop-blur"
      >
        <Icon name="flag" className="h-4 w-4" />
        Host
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#111114] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" />
            <div className="mx-auto max-w-md">
              {body}
              <Button full variant="ghost" className="mt-3" onClick={() => setOpen(false)}>
                Back to my game
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tally({ tally }: { tally: { name: string; votes: number }[] }) {
  if (tally.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1">
      {tally.map((t) => (
        <li key={t.name} className="flex justify-between text-sm text-white/70">
          <span>{t.name}</span>
          <span className="tabular-nums">{t.votes}</span>
        </li>
      ))}
    </ul>
  );
}

function HostRecap({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<{ at: string; text: string }[] | null>(null);
  useEffect(() => {
    fetch(`/api/day-of-deception/recap?sessionId=${sessionId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, [sessionId]);
  if (!items || items.length === 0) return null;
  return (
    <Card className="p-4">
      <Eyebrow>What really happened</Eyebrow>
      <ol className="mt-3 space-y-2 border-l border-white/10 pl-3">
        {items.map((r, i) => (
          <li key={i} className="text-sm text-white/70">
            <span className="mr-2 text-xs tabular-nums text-white/35">
              {new Date(r.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            {formatClueText(r.text)}
          </li>
        ))}
      </ol>
    </Card>
  );
}
