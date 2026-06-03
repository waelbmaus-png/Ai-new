import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deduplicateArticle,
  recordDeduplicationCheck,
} from "@/lib/services/deduplication";
import {
  logCronJob,
  logArticleHistory,
} from "@/lib/services/history-logger";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[v0] Starting deduplication cron job");
    await logCronJob("deduplicate", "running");

    const supabase = await createClient();

    // Get raw articles that haven't been processed
    const { data: rawArticles, error: fetchError } = await supabase
      .from("raw_articles")
      .select("id, title, url, content, feed_id")
      .not("id", "in", `(
        SELECT raw_article_id FROM deduplication_records
      )`)
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch raw articles: ${fetchError.message}`);
    }

    console.log(`[v0] Found ${rawArticles?.length || 0} unprocessed articles`);

    let processedCount = 0;
    let duplicatesFound = 0;
    const errors: string[] = [];

    if (rawArticles && rawArticles.length > 0) {
      for (const rawArticle of rawArticles) {
        try {
          // Check if article already exists
          const { data: existing } = await supabase
            .from("articles")
            .select("id")
            .eq("url", rawArticle.url)
            .single();

          let articleId = existing?.id;

          // If article doesn't exist, create it
          if (!articleId) {
            const { data: created, error: insertError } = await supabase
              .from("articles")
              .insert({
                title: rawArticle.title,
                url: rawArticle.url,
                content: rawArticle.content,
                status: "pending",
              })
              .select("id")
              .single();

            if (insertError) {
              throw new Error(
                `Failed to create article: ${insertError.message}`
              );
            }

            articleId = created?.id;
          }

          if (!articleId) {
            throw new Error("Failed to get article ID");
          }

          // Check for duplicates
          const dedupResult = await deduplicateArticle({
            id: articleId,
            title: rawArticle.title,
            url: rawArticle.url,
            content: rawArticle.content,
          });

          await recordDeduplicationCheck(
            articleId,
            rawArticle.id,
            {
              id: articleId,
              title: rawArticle.title,
              url: rawArticle.url,
              content: rawArticle.content,
            },
            dedupResult
          );

          if (dedupResult.isDuplicate) {
            // Update article status to "deduped"
            await supabase
              .from("articles")
              .update({
                status: "deduped",
              })
              .eq("id", articleId);

            await logArticleHistory(
              articleId,
              "deduped",
              "duplicate",
              {
                duplicateOf: dedupResult.duplicateOfId,
                strategy: dedupResult.strategy,
                similarity: dedupResult.similarityScore,
              }
            );

            duplicatesFound++;
          } else {
            // Not a duplicate, ready for enrichment
            await supabase
              .from("articles")
              .update({
                status: "enriched",
              })
              .eq("id", articleId);

            await logArticleHistory(articleId, "deduped", "unique");
          }

          processedCount++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[v0] Error processing raw article ${rawArticle.id}:`, errorMsg);
          errors.push(`Article ${rawArticle.id}: ${errorMsg}`);
        }
      }
    }

    await logCronJob("deduplicate", "success", {
      articlesProcessed: processedCount,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        processedCount,
        duplicatesFound,
        uniqueArticles: processedCount - duplicatesFound,
        errorsCount: errors.length,
      },
    });

    console.log(
      `[v0] Deduplication completed. Processed: ${processedCount}, Duplicates: ${duplicatesFound}`
    );

    return NextResponse.json({
      success: true,
      processedCount,
      duplicatesFound,
      uniqueArticles: processedCount - duplicatesFound,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[v0] Deduplication cron failed:", errorMsg);

    await logCronJob("deduplicate", "failed", {
      errorMessage: errorMsg,
    });

    return NextResponse.json(
      { error: "Deduplication failed", details: errorMsg },
      { status: 500 }
    );
  }
}
