import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    // Delete only if user is the author (RLS also enforces this)
    const { error: deleteError } = await supabase
      .from("community_categories")
      .delete()
      .eq("id", categoryId)
      .eq("author_id", user.id);

    if (deleteError) {
      console.error("Unpublish category error:", deleteError);
      return NextResponse.json({ error: "Failed to unpublish category" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unpublish category error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
