import { NextRequest, NextResponse } from "next/server";
import { getActiveRSSFeeds, fetchRSSFeed, saveRawArticles } from "@/lib/services/rss-fetcher";
import { logCronJob } from "@/lib/services/history-logger";

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify Vercel Cron secret if set
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[v0] Starting RSS feed fetch cron job");
    await logCronJob("fetch-feeds", "running");

    const feeds = await getActiveRSSFeeds();
    console.log(`[v0] Found ${feeds.length} active feeds`);

    let totalArticles = 0;
    const errors: string[] = [];

    for (const feed of feeds) {
      try {
        console.log(`[v0] Fetching feed: ${feed.name}`);
        const articles = await fetchRSSFeed(feed.url, feed.id);
        console.log(`[v0] Fetched ${articles.length} articles from ${feed.name}`);

        if (articles.length > 0) {
          await saveRawArticles(articles);
          totalArticles += articles.length;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[v0] Error processing feed ${feed.name}:`, errorMsg);
        errors.push(`${feed.name}: ${errorMsg}`);
      }
    }

    await logCronJob("fetch-feeds", "success", {
      articlesProcessed: totalArticles,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        feedsProcessed: feeds.length,
        articlesFound: totalArticles,
        errorsCount: errors.length,
      },
    });

    console.log(`[v0] RSS feed fetch completed. Total articles: ${totalArticles}`);

    return NextResponse.json({
      success: true,
      feedsProcessed: feeds.length,
      articlesFound: totalArticles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[v0] RSS feed fetch cron failed:", errorMsg);

    await logCronJob("fetch-feeds", "failed", {
      errorMessage: errorMsg,
    });

    return NextResponse.json(
      { error: "Feed fetch failed", details: errorMsg },
      { status: 500 }
    );
  }
}
