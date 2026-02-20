import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { sessionId, token, catIdx, clueIdx, round } = await req.json();

    if (!sessionId || !token || catIdx == null || clueIdx == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Validate companion token
    const { data: session, error } = await supabase
      .from("live_sessions")
      .select("board_data, double_jeopardy_board")
      .eq("id", sessionId)
      .eq("host_companion_token", token)
      .maybeSingle();

    if (error || !session) {
      return NextResponse.json({ error: "Invalid session or token" }, { status: 403 });
    }

    // Pick correct board based on round
    const boardData = round === 2 ? session.double_jeopardy_board : session.board_data;
    if (!boardData) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Extract answer from board data
    const board = boardData as { columns?: Array<{ questions?: Array<{ answer?: string; question?: string }> }> };
    const answer = board.columns?.[catIdx]?.questions?.[clueIdx]?.answer;

    if (!answer) {
      return NextResponse.json({ error: "Clue not found" }, { status: 404 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Companion clue error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
