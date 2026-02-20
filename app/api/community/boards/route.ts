import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "hot";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const mode = searchParams.get("mode") || "";

    // Build query
    let query = supabase
      .from("community_boards")
      .select("*", { count: "exact" });

    // Mode filter
    if (mode === "trivia_free4all" || mode === "classic_jeopardy") {
      query = query.eq("mode", mode);
    }

    // Search filter
    if (search.trim()) {
      query = query.or(`title.ilike.%${search}%,category_names.cs.{${search}}`);
    }

    // Sort
    if (sort === "new") {
      query = query.order("created_at", { ascending: false });
    } else if (sort === "top") {
      // Sort by net score (upvotes - downvotes) desc, then by date
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
    } else {
      // "hot" — recent boards with good scores first
      // Use upvotes desc + recent created_at as a proxy for "hot"
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: boards, error: boardsError, count } = await query;

    if (boardsError) {
      console.error("Community boards query error:", boardsError);
      return NextResponse.json({ error: "Failed to load boards" }, { status: 500 });
    }

    // Get user's votes for these boards
    const boardIds = (boards || []).map((b) => b.id);
    let userVotes: Record<string, number> = {};

    if (boardIds.length > 0) {
      const { data: votes } = await supabase
        .from("community_board_votes")
        .select("board_id, vote")
        .eq("user_id", user.id)
        .in("board_id", boardIds);

      if (votes) {
        userVotes = Object.fromEntries(votes.map((v) => [v.board_id, v.vote]));
      }
    }

    // Format response
    const formattedBoards = (boards || []).map((b) => ({
      id: b.id,
      authorId: b.author_id,
      authorName: b.author_name,
      title: b.title,
      description: b.description,
      boardData: b.board_data,
      categoryNames: b.category_names,
      mode: b.mode || null,
      upvotes: b.upvotes,
      downvotes: b.downvotes,
      saveCount: b.save_count,
      myVote: userVotes[b.id] ?? null,
      createdAt: b.created_at,
    }));

    return NextResponse.json({
      boards: formattedBoards,
      total: count || 0,
      page,
      hasMore: offset + limit < (count || 0),
    });
  } catch (err) {
    console.error("Community boards GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boardId, title, description, mode } = await req.json();

    if (!boardId || !title?.trim()) {
      return NextResponse.json({ error: "boardId and title are required" }, { status: 400 });
    }

    // Load the source board (must belong to user)
    const { data: board, error: boardError } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .eq("user_id", user.id)
      .single();

    if (boardError || !board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // Get author display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const authorName = profile?.display_name || user.email?.split("@")[0] || "Anonymous";

    // Extract category names from board data
    const boardData = board.board_data as { columns?: Array<{ title: string }> };
    const categoryNames = (boardData.columns || []).map((col) => col.title);

    // Check if already published from this source board
    const { data: existing } = await supabase
      .from("community_boards")
      .select("id")
      .eq("source_board_id", boardId)
      .eq("author_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This board is already published" }, { status: 409 });
    }

    // Validate mode if provided
    const validModes = ["trivia_free4all", "classic_jeopardy"];
    const boardMode = validModes.includes(mode) ? mode : null;

    // Insert community board
    const { data: communityBoard, error: insertError } = await supabase
      .from("community_boards")
      .insert({
        author_id: user.id,
        author_name: authorName,
        source_board_id: boardId,
        title: title.trim(),
        description: (description || "").trim().slice(0, 200),
        board_data: board.board_data,
        category_names: categoryNames,
        mode: boardMode,
      })
      .select("id")
      .single();

    if (insertError || !communityBoard) {
      console.error("Publish error:", insertError);
      return NextResponse.json({ error: "Failed to publish board" }, { status: 500 });
    }

    return NextResponse.json({ id: communityBoard.id });
  } catch (err) {
    console.error("Community boards POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
