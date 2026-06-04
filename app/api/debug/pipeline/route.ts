import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all table counts
    const results = await Promise.allSettled([
      supabase.from("raw_articles").select("id", { count: "exact" }),
      supabase.from("articles").select("id", { count: "exact" }),
      supabase.from("deduplication_records").select("id", { count: "exact" }),
      supabase.from("published_articles").select("id", { count: "exact" }),
      supabase.from("rss_feeds").select("id", { count: "exact" }),
      supabase.from("rss_feeds").select("id", { count: "exact" }).eq("active", true),
      supabase.from("cron_logs").select("id", { count: "exact" }),
    ]);

    const extractCount = (result: PromiseSettledResult<any>): number => {
      if (result.status === "fulfilled" && result.value?.count !== undefined) {
        return result.value.count;
      }
      return 0;
    };

    const rawArticlesCount = extractCount(results[0]);
    const articlesCount = extractCount(results[1]);
    const dedupCount = extractCount(results[2]);
    const publishedCount = extractCount(results[3]);
    const feedsCount = extractCount(results[4]);
    const activeFeeds = extractCount(results[5]);
    const cronLogsCount = extractCount(results[6]);

    // Get sample raw article
    const { data: sampleRawArticle } = await supabase
      .from("raw_articles")
      .select("*")
      .limit(1)
      .single();

    // Get sample processed article
    const { data: sampleArticle } = await supabase
      .from("articles")
      .select("*")
      .limit(1)
      .single();

    // Get recent errors from cron logs
    const { data: recentErrors } = await supabase
      .from("cron_logs")
      .select("*")
      .neq("error_message", null)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get articles by status
    const { data: statusCounts } = await supabase
      .from("articles")
      .select("status", { count: "exact" });

    const statusBreakdown: Record<string, number> = {};
    if (statusCounts) {
      for (const record of statusCounts) {
        statusBreakdown[record.status || "unknown"] = (statusBreakdown[record.status || "unknown"] || 0) + 1;
      }
    }

    // Check deduplication records for raw articles
    const { data: dedupInfo } = await supabase
      .from("deduplication_records")
      .select("id, raw_article_id, is_duplicate")
      .limit(10);

    // Get table schema info
    let tableInfo = null;
    try {
      const { data } = await supabase
        .rpc("information_schema.tables", {});
      tableInfo = data;
    } catch (err) {
      // Table schema info not available
    }

    return NextResponse.json({
      pipeline: {
        raw_articles: rawArticlesCount || 0,
        articles: articlesCount || 0,
        deduplication_records: dedupCount || 0,
        published_articles: publishedCount || 0,
      },
      feeds: {
        total: feedsCount || 0,
        active: activeFeeds || 0,
      },
      statusBreakdown,
      samples: {
        raw_article: sampleRawArticle,
        article: sampleArticle,
        dedup_sample: dedupInfo?.[0],
      },
      errors: recentErrors || [],
      cron_logs_total: cronLogsCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[v0] Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
