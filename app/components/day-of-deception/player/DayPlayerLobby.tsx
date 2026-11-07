"use client";

import React from "react";
import { Avatar, Card, Eyebrow, Screen, Title } from "../ui";

interface DayPlayerLobbyProps {
  players: { id: string; displayName: string; avatarColor: string }[];
  playerName: string;
  // Shown above the list (e.g. the "about you" questions)
  children?: React.ReactNode;
}

export default function DayPlayerLobby({ players, playerName, children }: DayPlayerLobbyProps) {
  return (
    <Screen>
      <div className="text-center pt-4">
        <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8C67A] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8C67A]" />
          </span>
          <span className="text-xs text-white/60">Waiting for the host</span>
        </div>
        <Title>You&apos;re in, {playerName}.</Title>
        <p className="mt-3 text-[15px] text-white/50">
          Roles get handed out when the host starts. Keep this app handy.
        </p>
      </div>

      {children && <div className="mt-8">{children}</div>}

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <Eyebrow>Players</Eyebrow>
          <span className="text-xs tabular-nums text-white/40">{players.length}</span>
        </div>
        <Card className="p-2">
          <ul className="divide-y divide-white/[0.06]">
            {players.map((p) => {
              const isMe = p.displayName === playerName;
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={p.displayName} color={p.avatarColor} size="sm" />
                  <span className={`text-[15px] ${isMe ? "text-white font-medium" : "text-white/75"}`}>
                    {p.displayName}
                  </span>
                  {isMe && <span className="ml-auto text-xs text-white/35">You</span>}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Screen>
  );
}
