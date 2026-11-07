"use client";

import { useState } from "react";
import DayHostClueLog from "./DayHostClueLog";
import { Avatar, Button, Card, Eyebrow, Icon, Screen, Title, display } from "../ui";
import type { IconName } from "../ui";

interface DayHostFreeplayProps {
  sessionId: string;
  players: {
    id: string;
    displayName: string;
    avatarColor: string;
    shadowTokens: number;
  }[];
  onSendMission: (playerId?: string) => Promise<void>;
  onStartEvent: (eventTemplate?: string) => Promise<void>;
  onStartRoundtable: () => Promise<void>;
  missionsSent: number;
  eventsCompleted: number;
  customEventNames?: string[];
}

const DEFAULT_EVENT_TEMPLATES = ["Trust Circle", "Shadow Trade", "Loyalty Test", "Sealed Vote", "Hidden Agenda"];

function ActionCard({
  icon,
  title,
  body,
  children,
}: {
  icon: IconName;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8C67A]/10 text-[#E8C67A]">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h3 className={`${display} mt-4 text-2xl text-white`}>{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-white/50">{body}</p>
      <div className="mt-5 space-y-2">{children}</div>
    </Card>
  );
}

function PickList({ items, onPick, disabled }: { items: { key: string; label: React.ReactNode }[]; onPick: (k: string) => void; disabled?: boolean }) {
  return (
    <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/[0.06] bg-black/20 p-1">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onPick(it.key)}
          disabled={disabled}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-30"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export default function DayHostFreeplay({
  sessionId,
  players,
  onSendMission,
  onStartEvent,
  onStartRoundtable,
  missionsSent,
  eventsCompleted,
  customEventNames,
}: DayHostFreeplayProps) {
  const [sendingMission, setSendingMission] = useState(false);
  const [startingEvent, setStartingEvent] = useState(false);
  const [startingRoundtable, setStartingRoundtable] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showPlayerMission, setShowPlayerMission] = useState(false);
  const [confirmRoundtable, setConfirmRoundtable] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleSendMission(playerId?: string) {
    setSendingMission(true);
    setActionError(null);
    setNotice(null);
    try {
      await onSendMission(playerId);
      setNotice("Mission sent.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send mission");
    } finally {
      setSendingMission(false);
      setShowPlayerMission(false);
    }
  }

  async function handleStartEvent(template?: string) {
    setStartingEvent(true);
    setActionError(null);
    try {
      await onStartEvent(template);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start event");
    } finally {
      setStartingEvent(false);
      setShowEventPicker(false);
    }
  }

  async function handleStartRoundtable() {
    setStartingRoundtable(true);
    setActionError(null);
    try {
      await onStartRoundtable();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to start roundtable");
      setStartingRoundtable(false);
    }
  }

  const eventNames = customEventNames && customEventNames.length > 0 ? customEventNames : DEFAULT_EVENT_TEMPLATES;

  return (
    <Screen wide>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>The day is on</Eyebrow>
          <Title className="mt-2">Run the day</Title>
        </div>
        <div className="flex gap-6">
          {[
            ["Missions sent", missionsSent],
            ["Events done", eventsCompleted],
            ["Players", players.length],
          ].map(([label, n]) => (
            <div key={label as string} className="text-right">
              <p className="text-3xl font-extralight tabular-nums text-white">{n}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {(actionError || notice) && (
        <p
          className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
            actionError ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          {actionError ?? notice}
        </p>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <ActionCard icon="flag" title="Event" body="Get everyone together. When it ends, you pick the winners and they each get a secret clue.">
          <Button full onClick={() => handleStartEvent()} disabled={startingEvent}>
            {startingEvent ? "Starting" : "Start a random event"}
          </Button>
          <Button full variant="secondary" onClick={() => setShowEventPicker((s) => !s)}>
            Choose one
          </Button>
          {showEventPicker && (
            <PickList
              disabled={startingEvent}
              onPick={(k) => handleStartEvent(k)}
              items={eventNames.map((n) => ({ key: n, label: n }))}
            />
          )}
        </ActionCard>

        <ActionCard icon="send" title="Mission" body="Missions also go out automatically. Send one now to keep the Traitors busy.">
          <Button full variant="secondary" onClick={() => handleSendMission()} disabled={sendingMission}>
            {sendingMission ? "Sending" : "Send to a Traitor"}
          </Button>
          <Button full variant="ghost" onClick={() => setShowPlayerMission((s) => !s)}>
            Pick who gets it
          </Button>
          {showPlayerMission && (
            <PickList
              disabled={sendingMission}
              onPick={(k) => handleSendMission(k)}
              items={players.map((p) => ({
                key: p.id,
                label: (
                  <>
                    <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                    {p.displayName}
                  </>
                ),
              }))}
            />
          )}
        </ActionCard>

        <ActionCard icon="users" title="Roundtable" body="The end of the day. Everyone talks it out, then votes. This can't be undone.">
          {!confirmRoundtable ? (
            <Button full variant="danger" onClick={() => setConfirmRoundtable(true)}>
              Start the Roundtable
            </Button>
          ) : (
            <>
              <Button full variant="danger" onClick={handleStartRoundtable} disabled={startingRoundtable}>
                {startingRoundtable ? "Starting" : "Yes, end the day"}
              </Button>
              <Button full variant="ghost" onClick={() => setConfirmRoundtable(false)}>
                Not yet
              </Button>
            </>
          )}
        </ActionCard>
      </div>

      <div className="mt-10">
        <Eyebrow className="mb-3">Players</Eyebrow>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
              <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
              <span className="truncate text-sm text-white/80">{p.displayName}</span>
            </div>
          ))}
        </div>
      </div>

      <DayHostClueLog sessionId={sessionId} players={players} />
    </Screen>
  );
}
