interface VoteEntry {
  voterId: string;
  voterName: string;
  targetId: string;
  shadowTokens: number;
}

interface TallyEntry {
  name: string;
  votes: number;
  weightedVotes: number;
}

export function resolveVotes(
  votes: VoteEntry[],
  playerNames: Record<string, string>,
  maxTokenVoteBonus: number
): {
  tally: Record<string, TallyEntry>;
  accusedId: string | null;
  tied: boolean;
} {
  const tally: Record<string, TallyEntry> = {};

  for (const vote of votes) {
    if (!tally[vote.targetId]) {
      tally[vote.targetId] = {
        name: playerNames[vote.targetId] || "Unknown",
        votes: 0,
        weightedVotes: 0,
      };
    }
    const weight = 1 + Math.min(vote.shadowTokens, maxTokenVoteBonus);
    tally[vote.targetId].votes += 1;
    tally[vote.targetId].weightedVotes += weight;
  }

  // Find the player with the most weighted votes
  let maxWeighted = 0;
  let accusedId: string | null = null;
  let tied = false;

  for (const [playerId, entry] of Object.entries(tally)) {
    if (entry.weightedVotes > maxWeighted) {
      maxWeighted = entry.weightedVotes;
      accusedId = playerId;
      tied = false;
    } else if (entry.weightedVotes === maxWeighted && maxWeighted > 0) {
      tied = true;
    }
  }

  // Tie → deceivers win (no one accused)
  if (tied) {
    accusedId = null;
  }

  return { tally, accusedId, tied };
}

export function determineWinner(
  accusedId: string | null,
  accusedRole: string | null
): "faithful" | "traitors" {
  if (!accusedId || !accusedRole) return "traitors";
  return accusedRole === "traitor" ? "faithful" : "traitors";
}
