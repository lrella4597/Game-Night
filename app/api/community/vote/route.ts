import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, vote } = await req.json();

    if (!boardId || ![1, -1, 0].includes(vote)) {
      return NextResponse.json({ error: "boardId and vote (1, -1, or 0) are required" }, { status: 400 });
    }

    // Call the vote function
    const { data, error } = await supabase.rpc("vote_community_board", {
      p_board_id: boardId,
      p_user_id: user.id,
      p_vote: vote,
    });

    if (error) {
      console.error("Vote error:", error);
      return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
    }

    const result = data?.[0] || { new_upvotes: 0, new_downvotes: 0 };

    return NextResponse.json({
      upvotes: result.new_upvotes,
      downvotes: result.new_downvotes,
    });
  } catch (err) {
    console.error("Vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
