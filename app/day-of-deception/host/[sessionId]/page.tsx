"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/live/useRealtimeChannel";
import { useDayHostControls } from "@/lib/day-of-deception/useHostControls";
import { useGameChanges } from "@/lib/day-of-deception/useGameChanges";
import { getDayChannelName } from "@/lib/day-of-deception/channelEvents";
import DayHostLobby from "@/app/components/day-of-deception/host/DayHostLobby";
import DayHostClueLog from "@/app/components/day-of-deception/host/DayHostClueLog";
import HostPanel from "@/app/components/day-of-deception/host/HostPanel";
import DodHelp from "@/app/components/day-of-deception/DodHelp";
import { Button, Eyebrow, Icon, LoadingScreen, Screen, Title } from "@/app/components/day-of-deception/ui";
import type { DayPhase, DaySessionConfig, DaySessionRow } from "@/lib/day-of-deception/types";
import { daySessionFromRow } from "@/lib/day-of-deception/types";

interface PublicPlayer {
  id: string;
  displayName: string;
  avatarColor: string;
  isConnected: boolean;
  shadowTokens: number;
}

export default function TraitorsDayHostPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<DayPhase>("lobby");
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [config, setConfig] = useState<DaySessionConfig | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingToo, setPlayingToo] = useState(false);

  const [supabase] = useState(() => createClient());

  const { connected, broadcast } = useRealtimeChannel({
    sessionId,
    userId: user?.id || "",
    userName: "Host",
    isHost: true,
    channelName: getDayChannelName(sessionId),
  });
  const controls = useDayHostControls({ sessionId, broadcast });

  const refresh = useCallback(async () => {
    const [{ data: rows }, { data: gs }] = await Promise.all([
      supabase.from("traitors_day_players").select("*").eq("session_id", sessionId).order("joined_at", { ascending: true }),
      supabase.from("traitors_day_game_state").select("phase").eq("session_id", sessionId).single(),
    ]);
    if (rows) {
      setPlayers(
        rows.map((r) => ({
          id: r.id,
          displayName: r.display_name,
          avatarColor: r.avatar_color,
          isConnected: r.is_connected,
          shadowTokens: r.shadow_tokens ?? 0,
        }))
      );
      setPlayingToo(rows.some((r) => r.user_id && r.user_id === user?.id));
    }
    if (gs?.phase) setPhase(gs.phase as DayPhase);
  }, [sessionId, supabase, user?.id]);

  useEffect(() => {
    if (!sessionId || authLoading || !user) return;
    (async () => {
      const { data: sessionRow } = await supabase.from("traitors_day_sessions").select("*").eq("id", sessionId).single();
      if (!sessionRow) {
        setError("Game not found");
      } else if (sessionRow.host_id !== user.id) {
        setError("You are not the host of this game");
      } else {
        const session = daySessionFromRow(sessionRow as DaySessionRow);
        setConfig(session.config);
        setJoinCode(session.joinCode);
        await refresh();
      }
      setLoading(false);
    })();
  }, [sessionId, user, authLoading, supabase, refresh]);

  // Joins, phase changes, votes: refresh from the database
  useGameChanges(loading ? null : sessionId, () => refresh());

  // Keep the lobby list fresh for phones that only listen to broadcasts
  useEffect(() => {
    if (loading || phase !== "lobby") return;
    const t = setInterval(() => {
      refresh();
      controls.broadcastPlayers();
    }, 5000);
    return () => clearInterval(t);
  }, [loading, phase, refresh, controls]);

  if (authLoading || loading) return <LoadingScreen label="Loading your game" />;

  if (error || !config) {
    return (
      <Screen center>
        <div className="text-center">
          <Title size="md">Something went wrong.</Title>
          <p className="mt-3 text-[15px] text-rose-300">{error}</p>
          <Button variant="secondary" className="mt-8" onClick={() => router.push("/day-of-deception")}>
            Back to my games
          </Button>
        </div>
      </Screen>
    );
  }

  const help = (
    <DodHelp
      gameKey="howto_dod_host_v4"
      title="How to host"
      sections={[
        {
          title: "Setup",
          steps: [
            "Put the QR code on a screen. People with the app already just open it and type the code",
            "Playing too? Tap Join as a player. Your player screen gets a Host button, so one phone runs everything",
            "Optional: tap Customize Today so the AI writes missions and events for your group",
          ],
        },
        {
          title: "Each round",
          steps: [
            "Murder: open it in round 1. After that it opens by itself, one per round. The Traitors do a move to someone in plain sight",
            "When it's done, call breakfast. Everyone checks in, then the victim is revealed",
            "Run events. Pick what winners get: a private clue, the shield-or-team-clue choice, a double vote, or a truth check. Mix them up",
            "Missions go to Traitors automatically. Nothing about them shows on anyone's main screen",
          ],
        },
        {
          title: "The Roundtable",
          steps: [
            "Start the vote. Close it, then go around the table: everyone holds up their phone",
            "Count them. The banished player reveals their own role",
            "Back to the day for another round, until every Traitor is out or the Traitors match the Faithful",
            "With 4 or fewer left, everyone votes to end or banish again",
          ],
        },
      ]}
    />
  );

  if (phase === "lobby") {
    return (
      <>
        {help}
        <DayHostLobby
          sessionId={sessionId}
          players={players}
          joinCode={joinCode}
          config={config}
          onStartGame={async () => {
            await controls.startGame();
            setPhase("roles_revealed");
          }}
          onKickPlayer={async (id) => {
            await controls.kickPlayer(id);
            await refresh();
          }}
        />
      </>
    );
  }

  return (
    <Screen>
      {help}
      <Eyebrow>Hosting</Eyebrow>
      <Title className="mt-2">Run the game.</Title>
      {playingToo && (
        <Link
          href={`/day-of-deception/play?code=${encodeURIComponent(joinCode)}`}
          className="mt-4 flex items-center gap-2 text-sm text-[#E8C67A] hover:text-[#F1D597]"
        >
          <Icon name="arrow" className="h-4 w-4" />
          Back to my player screen (it has these controls too)
        </Link>
      )}
      <div className="mt-6">
        <HostPanel sessionId={sessionId} broadcast={broadcast} mode="inline" />
      </div>
      <DayHostClueLog sessionId={sessionId} players={players} />
      {!connected && <p className="mt-6 text-center text-xs text-white/30">Reconnecting</p>}
    </Screen>
  );
}
