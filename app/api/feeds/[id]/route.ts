import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    console.log("[v0] Attempting to delete feed with ID:", id);

    // First, verify the feed exists
    const { data: feed, error: selectError } = await supabase
      .from("rss_feeds")
      .select("id, name")
      .eq("id", id)
      .single();

    if (selectError || !feed) {
      console.error("[v0] Error finding feed:", selectError);
      return NextResponse.json(
        { error: "Feed not found" },
        { status: 404 }
      );
    }

    console.log(`[v0] Found feed to delete: ${feed.name} (${feed.id})`);

    // Delete the feed
    const { error: deleteError } = await supabase
      .from("rss_feeds")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[v0] DETAILED ERROR: Failed to delete feed");
      console.error("[v0] Error code:", deleteError.code);
      console.error("[v0] Error message:", deleteError.message);
      console.error("[v0] Error details:", deleteError.details);
      console.error("[v0] Error hint:", deleteError.hint);
      throw deleteError;
    }

    console.log(`[v0] Successfully deleted feed: ${feed.name}`);

    return NextResponse.json({
      success: true,
      message: `Feed "${feed.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("[v0] Error in delete feed endpoint:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete feed",
      },
      { status: 500 }
    );
  }
}
