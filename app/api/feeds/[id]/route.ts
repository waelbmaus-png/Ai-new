import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Delete the feed - will cascade delete related raw_articles
    const { error } = await supabase
      .from("rss_feeds")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete feed: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Error deleting feed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete feed",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: feed, error } = await supabase
      .from("rss_feeds")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch feed: ${error.message}`);
    }

    return NextResponse.json(feed);
  } catch (error) {
    console.error("[v0] Error fetching feed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch feed",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const body = await request.json();
    const { name, url, category, active, refreshIntervalHours } = body;

    const { data, error } = await supabase
      .from("rss_feeds")
      .update({
        ...(name && { name }),
        ...(url && { url }),
        ...(category && { category }),
        ...(active !== undefined && { active }),
        ...(refreshIntervalHours && { refresh_interval_hours: refreshIntervalHours }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update feed: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error updating feed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update feed",
      },
      { status: 500 }
    );
  }
}
