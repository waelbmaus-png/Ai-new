import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: feeds, error } = await supabase
      .from("rss_feeds")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch feeds: ${error.message}`);
    }

    return NextResponse.json(feeds);
  } catch (error) {
    console.error("[v0] Error fetching feeds:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch feeds",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { name, url, category, refreshIntervalHours } = body;

    const { data, error } = await supabase
      .from("rss_feeds")
      .insert({
        name,
        url,
        category,
        refresh_interval_hours: refreshIntervalHours || 4,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create feed: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error creating feed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create feed",
      },
      { status: 500 }
    );
  }
}
