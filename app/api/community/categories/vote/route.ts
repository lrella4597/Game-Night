import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Call the toggle-vote function
    const { data, error } = await supabase.rpc("vote_community_category", {
      p_category_id: categoryId,
      p_user_id: user.id,
    });

    if (error) {
      console.error("Category vote error:", error);
      return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
    }

    const result = data?.[0] || { new_upvotes: 0 };

    return NextResponse.json({
      upvotes: result.new_upvotes,
    });
  } catch (err) {
    console.error("Category vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
