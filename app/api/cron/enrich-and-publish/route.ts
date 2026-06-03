import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enrichArticleWithAI,
  generateLabelsFromContent,
  updateArticleLabels,
} from "@/lib/services/ai-enrichment";
import {
  createBloggerPost,
  publishBloggerPost,
} from "@/lib/services/blogger-api";
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

    console.log("[v0] Starting enrichment and publish cron job");
    await logCronJob("enrich-and-publish", "running");

    const supabase = await createClient();

    // Get articles ready for enrichment (status = "enriched" but no meta_description yet)
    const { data: enrichedArticles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, content, url, author, original_published_at")
      .eq("status", "enriched")
      .is("meta_description", null)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`[v0] Found ${enrichedArticles?.length || 0} articles for enrichment`);

    let enrichedCount = 0;
    let publishedCount = 0;
    const errors: string[] = [];

    if (enrichedArticles && enrichedArticles.length > 0) {
      for (const article of enrichedArticles) {
        try {
          // Enrich with AI
          console.log(`[v0] Enriching article: ${article.title}`);
          const enriched = await enrichArticleWithAI(
            article.title,
            article.content || ""
          );

          if (!enriched) {
            throw new Error("AI enrichment failed");
          }

          // Update article with enriched data
          await supabase
            .from("articles")
            .update({
              meta_description: enriched.metaDescription,
              meta_keywords: enriched.metaKeywords,
              ai_generated_labels: enriched.labels,
              summary: enriched.summary,
            })
            .eq("id", article.id);

          await logArticleHistory(article.id, "enriched", "success", {
            metaDescription: enriched.metaDescription,
            labelsCount: enriched.labels.length,
          });

          enrichedCount++;

          // Check if auto-publish is enabled
          const { data: config } = await supabase
            .from("system_config")
            .select("config_value")
            .eq("config_key", "auto_publish_drafts")
            .single();

          const autoPublish = config?.config_value === "true";

          if (autoPublish && article.title && enriched.metaDescription) {
            // Create Blogger post
            console.log(`[v0] Publishing to Blogger: ${article.title}`);
            const bloggerResult = await createBloggerPost({
              title: article.title,
              content: article.content || "",
              labels: enriched.labels,
              isDraft: false, // Not a draft if we're publishing
            });

            if (bloggerResult) {
              // Update article with Blogger post info
              await supabase
                .from("articles")
                .update({
                  blogger_post_id: bloggerResult.postId,
                  blogger_published_at: new Date().toISOString(),
                  blogger_draft: false,
                  status: "published",
                })
                .eq("id", article.id);

              await logArticleHistory(article.id, "published", "success", {
                bloggerPostId: bloggerResult.postId,
                bloggerUrl: bloggerResult.url,
              });

              publishedCount++;
            } else {
              throw new Error("Failed to create Blogger post");
            }
          } else if (!autoPublish) {
            // Create as draft for manual review
            console.log(`[v0] Creating draft in Blogger: ${article.title}`);
            const bloggerResult = await createBloggerPost({
              title: article.title,
              content: article.content || "",
              labels: enriched.labels,
              isDraft: true,
            });

            if (bloggerResult) {
              await supabase
                .from("articles")
                .update({
                  blogger_post_id: bloggerResult.postId,
                  blogger_draft: true,
                  status: "published",
                })
                .eq("id", article.id);

              await logArticleHistory(
                article.id,
                "published",
                "draft_created",
                {
                  bloggerPostId: bloggerResult.postId,
                }
              );

              publishedCount++;
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[v0] Error processing article ${article.id}:`, errorMsg);

          await supabase
            .from("articles")
            .update({
              status: "failed",
              error_message: errorMsg,
            })
            .eq("id", article.id);

          await logArticleHistory(article.id, "failed", "enrichment_error", null, errorMsg);

          errors.push(`Article ${article.id}: ${errorMsg}`);
        }
      }
    }

    await logCronJob("enrich-and-publish", "success", {
      articlesProcessed: enrichedCount,
      articlesPublished: publishedCount,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        enrichedCount,
        publishedCount,
        errorsCount: errors.length,
      },
    });

    console.log(
      `[v0] Enrichment completed. Enriched: ${enrichedCount}, Published: ${publishedCount}`
    );

    return NextResponse.json({
      success: true,
      enrichedCount,
      publishedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[v0] Enrichment cron failed:", errorMsg);

    await logCronJob("enrich-and-publish", "failed", {
      errorMessage: errorMsg,
    });

    return NextResponse.json(
      { error: "Enrichment failed", details: errorMsg },
      { status: 500 }
    );
  }
}
