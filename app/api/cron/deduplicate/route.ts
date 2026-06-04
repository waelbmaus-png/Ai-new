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

export async function GET(request: NextRequest) {
  return POST(request);
}

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

    // Step 1: Count all raw articles
    const { count: totalRawArticles } = await supabase
      .from("raw_articles")
      .select("id", { count: "exact" });

    console.log(`[v0] Total raw articles in database: ${totalRawArticles}`);

    // Step 2: Get articles already processed
    const { data: processedIds, error: processedError } = await supabase
      .from("deduplication_records")
      .select("raw_article_id");

    if (processedError) {
      console.error("[v0] Error fetching processed articles:", processedError);
    }

    const processedSet = new Set(processedIds?.map(r => r.raw_article_id) || []);
    console.log(`[v0] Articles already processed: ${processedSet.size}`);

    // Step 3: Get unprocessed raw articles
    const { data: allRawArticles, error: fetchAllError } = await supabase
      .from("raw_articles")
      .select("id, title, url, content, feed_id")
      .limit(1000);

    if (fetchAllError) {
      throw new Error(`Failed to fetch raw articles: ${fetchAllError.message}`);
    }

    const rawArticles = allRawArticles?.filter(
      (article) => !processedSet.has(article.id)
    ) || [];

    console.log(`[v0] Found ${rawArticles.length} unprocessed articles for deduplication`);

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
            console.log(`[v0] Creating new article from raw_article ${rawArticle.id}: ${rawArticle.title}`);
            
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
              console.error(`[v0] CRITICAL ERROR inserting article: ${insertError.code} - ${insertError.message}`);
              console.error("[v0] Error details:", insertError.details);
              throw new Error(
                `Failed to create article: ${insertError.message}`
              );
            }

            if (!created?.id) {
              throw new Error("Article created but no ID returned");
            }

            console.log(`[v0] Successfully created article ${created.id}`);
            articleId = created.id;
          } else {
            console.log(`[v0] Article already exists for URL ${rawArticle.url}`);
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
            console.log(`[v0] Article ${articleId} identified as duplicate (${dedupResult.strategy} match)`);
            
            // Update article status to "deduped"
            const { error: updateError } = await supabase
              .from("articles")
              .update({
                status: "deduped",
              })
              .eq("id", articleId);

            if (updateError) {
              console.error(`[v0] Error updating article status to deduped: ${updateError.message}`);
              throw updateError;
            }

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
            console.log(`[v0] Article ${articleId} is unique, marking for enrichment`);
            
            // Not a duplicate, ready for enrichment
            const { error: updateError } = await supabase
              .from("articles")
              .update({
                status: "enriched",
              })
              .eq("id", articleId);

            if (updateError) {
              console.error(`[v0] Error updating article status to enriched: ${updateError.message}`);
              throw updateError;
            }

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

    // Get updated article counts
    const { count: articlesNow } = await supabase
      .from("articles")
      .select("id", { count: "exact" });

    console.log(`[v0] DEDUPLICATION SUMMARY:`);
    console.log(`[v0]   Articles processed: ${processedCount}`);
    console.log(`[v0]   Duplicates found: ${duplicatesFound}`);
    console.log(`[v0]   Unique articles: ${processedCount - duplicatesFound}`);
    console.log(`[v0]   Errors encountered: ${errors.length}`);
    console.log(`[v0]   Total articles now in database: ${articlesNow}`);
    console.log(`[v0]   Unprocessed raw articles remaining: ${rawArticles.length - processedCount}`);

    await logCronJob("deduplicate", "success", {
      articlesProcessed: processedCount,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        processedCount,
        duplicatesFound,
        uniqueArticles: processedCount - duplicatesFound,
        errorsCount: errors.length,
        totalArticlesInDb: articlesNow,
      },
    });

    return NextResponse.json({
      success: true,
      processedCount,
      duplicatesFound,
      uniqueArticles: processedCount - duplicatesFound,
      totalArticlesInDb: articlesNow,
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
