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

    let query = supabase
      .from("community_categories")
      .select("*", { count: "exact" });

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (sort === "new") {
      query = query.order("created_at", { ascending: false });
    } else {
      // "hot" and "top" both sort by upvotes desc then date
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: categories, error: catError, count } = await query;

    if (catError) {
      console.error("Community categories query error:", catError);
      return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
    }

    // Get user's votes
    const categoryIds = (categories || []).map((c) => c.id);
    let votedIds = new Set<string>();

    if (categoryIds.length > 0) {
      const { data: votes } = await supabase
        .from("community_category_votes")
        .select("category_id")
        .eq("user_id", user.id)
        .in("category_id", categoryIds);

      if (votes) {
        votedIds = new Set(votes.map((v) => v.category_id));
      }
    }

    const formatted = (categories || []).map((c) => ({
      id: c.id,
      authorId: c.author_id,
      authorName: c.author_name,
      name: c.name,
      description: c.description,
      promptTemplate: c.prompt_template,
      difficultyGuidance: c.difficulty_guidance,
      answerFormatGuidance: c.answer_format_guidance,
      examples: c.examples,
      upvotes: c.upvotes,
      saveCount: c.save_count,
      hasVoted: votedIds.has(c.id),
      createdAt: c.created_at,
    }));

    return NextResponse.json({
      categories: formatted,
      total: count || 0,
      page,
      hasMore: offset + limit < (count || 0),
    });
  } catch (err) {
    console.error("Community categories GET error:", err);
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

    const { categoryId, description } = await req.json();

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Load the source category (must belong to user)
    const { data: category, error: catError } = await supabase
      .from("category_library")
      .select("*")
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .single();

    if (catError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Get author display name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    const authorName = profile?.display_name || user.email?.split("@")[0] || "Anonymous";

    // Check if already published from this source
    const { data: existing } = await supabase
      .from("community_categories")
      .select("id")
      .eq("source_category_id", categoryId)
      .eq("author_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "This category is already published" }, { status: 409 });
    }

    const { data: communityCategory, error: insertError } = await supabase
      .from("community_categories")
      .insert({
        author_id: user.id,
        author_name: authorName,
        source_category_id: categoryId,
        name: category.name,
        description: (description || "").trim().slice(0, 200),
        prompt_template: category.prompt_template || "",
        difficulty_guidance: category.difficulty_guidance || "",
        answer_format_guidance: category.answer_format_guidance || "",
        examples: category.examples || "",
      })
      .select("id")
      .single();

    if (insertError || !communityCategory) {
      console.error("Publish category error:", insertError);
      return NextResponse.json({ error: "Failed to publish category" }, { status: 500 });
    }

    return NextResponse.json({ id: communityCategory.id });
  } catch (err) {
    console.error("Community categories POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
