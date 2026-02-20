import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { communityCategoryId } = await req.json();

    if (!communityCategoryId) {
      return NextResponse.json({ error: "communityCategoryId is required" }, { status: 400 });
    }

    // Load the community category
    const { data: communityCategory, error: loadError } = await supabase
      .from("community_categories")
      .select("name, prompt_template, difficulty_guidance, answer_format_guidance, examples, save_count")
      .eq("id", communityCategoryId)
      .single();

    if (loadError || !communityCategory) {
      return NextResponse.json({ error: "Community category not found" }, { status: 404 });
    }

    // Dedup: check if user already has a category with the same name (case-insensitive)
    const { data: existing } = await supabase
      .from("category_library")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", communityCategory.name)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have a category with this name" },
        { status: 409 }
      );
    }

    // Import to user's category_library
    const { error: insertError } = await supabase.from("category_library").insert({
      user_id: user.id,
      name: communityCategory.name,
      prompt_template: communityCategory.prompt_template || "",
      difficulty_guidance: communityCategory.difficulty_guidance || "",
      answer_format_guidance: communityCategory.answer_format_guidance || "",
      examples: communityCategory.examples || "",
      origin: "community",
    });

    if (insertError) {
      console.error("Save category error:", insertError);
      return NextResponse.json({ error: "Failed to save category" }, { status: 500 });
    }

    // Increment save_count on the community category
    await supabase
      .from("community_categories")
      .update({ save_count: (communityCategory.save_count || 0) + 1 })
      .eq("id", communityCategoryId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Save community category error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
