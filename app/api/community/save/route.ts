import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { communityBoardId } = await req.json();

    if (!communityBoardId) {
      return NextResponse.json({ error: "communityBoardId is required" }, { status: 400 });
    }

    // Load the community board
    const { data: communityBoard, error: loadError } = await supabase
      .from("community_boards")
      .select("title, board_data, save_count")
      .eq("id", communityBoardId)
      .single();

    if (loadError || !communityBoard) {
      return NextResponse.json({ error: "Community board not found" }, { status: 404 });
    }

    // Dedup: check if user already has a board with the same title
    const { data: existing } = await supabase
      .from("boards")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", communityBoard.title)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a board with this name" },
        { status: 409 }
      );
    }

    // Copy to user's boards library
    const { error: insertError } = await supabase.from("boards").insert({
      user_id: user.id,
      name: communityBoard.title,
      board_data: communityBoard.board_data,
      is_current: false,
    });

    if (insertError) {
      console.error("Save board error:", insertError);
      return NextResponse.json({ error: "Failed to save board" }, { status: 500 });
    }

    // Increment save_count on the community board
    await supabase
      .from("community_boards")
      .update({ save_count: (communityBoard.save_count || 0) + 1 })
      .eq("id", communityBoardId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save community board error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
