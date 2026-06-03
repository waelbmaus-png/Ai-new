import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get total articles
    const { count: totalArticles } = await supabase
      .from("articles")
      .select("id", { count: "exact" });

    // Get published articles
    const { count: publishedArticles } = await supabase
      .from("articles")
      .select("id", { count: "exact" })
      .eq("status", "published");

    // Get draft articles
    const { count: draftArticles } = await supabase
      .from("articles")
      .select("id", { count: "exact" })
      .eq("blogger_draft", true)
      .eq("status", "published");

    // Get pending articles
    const { count: pendingArticles } = await supabase
      .from("articles")
      .select("id", { count: "exact" })
      .in("status", ["pending", "enriched"]);

    // Get total RSS feeds
    const { count: totalFeeds } = await supabase
      .from("rss_feeds")
      .select("id", { count: "exact" });

    // Get recent cron job status
    const { data: recentCrons } = await supabase
      .from("cron_logs")
      .select("job_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    // Get articles by status
    const { data: articlesByStatus } = await supabase
      .from("articles")
      .select("status")
      .order("created_at", { ascending: false });

    const statusCounts = {
      pending: 0,
      enriched: 0,
      published: 0,
      deduped: 0,
      failed: 0,
    };

    articlesByStatus?.forEach((article: any) => {
      if (article.status in statusCounts) {
        statusCounts[article.status as keyof typeof statusCounts]++;
      }
    });

    return NextResponse.json({
      stats: {
        totalArticles: totalArticles || 0,
        publishedArticles: publishedArticles || 0,
        draftArticles: draftArticles || 0,
        pendingArticles: pendingArticles || 0,
        totalFeeds: totalFeeds || 0,
      },
      statusCounts,
      recentCrons: recentCrons || [],
    });
  } catch (error) {
    console.error("[v0] Error fetching dashboard stats:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}
