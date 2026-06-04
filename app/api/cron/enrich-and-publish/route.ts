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

    console.log("[v0] Starting enrichment and publish cron job");
    await logCronJob("enrich-and-publish", "running");

    const supabase = await createClient();

    // Count total articles
    const { count: totalArticles } = await supabase
      .from("articles")
      .select("id", { count: "exact" });

    console.log(`[v0] Total articles in database: ${totalArticles}`);

    // Count articles by status
    const { count: enrichedCount } = await supabase
      .from("articles")
      .select("id", { count: "exact" })
      .eq("status", "enriched");

    console.log(`[v0] Articles with status="enriched": ${enrichedCount}`);

    // Get articles ready for enrichment (status = "deduped" but no meta_description yet)
    console.log("[v0] Fetching articles with status='deduped' and no meta_description...");
    
    const { data: enrichedArticles, error: fetchError } = await supabase
      .from("articles")
      .select("id, title, content, url, author, original_published_at, status, meta_description")
      .eq("status", "deduped")
      .is("meta_description", null)
      .limit(50);

    if (fetchError) {
      console.error("[v0] ERROR fetching articles:", fetchError);
      throw new Error(`Failed to fetch articles: ${fetchError.message}`);
    }

    console.log(`[v0] Found ${enrichedArticles?.length || 0} articles for enrichment (status=deduped, no meta_description)`);
    
    if (enrichedArticles && enrichedArticles.length > 0) {
      console.log(`[v0] First article: ID=${enrichedArticles[0].id}, Title="${enrichedArticles[0].title}", Status=${enrichedArticles[0].status}`);
    }

    let enrichedProcessedCount = 0;
    let publishedCount = 0;
    const errors: string[] = [];

    if (enrichedArticles && enrichedArticles.length > 0) {
      for (const article of enrichedArticles) {
        try {
          console.log(`[v0] STEP 1: Selected article for enrichment - ID=${article.id}, Title="${article.title}"`);
          
          // Enrich with AI
          console.log(`[v0] STEP 2: Calling AI enrichment for article ${article.id}...`);
          const enriched = await enrichArticleWithAI(
            article.title,
            article.content || ""
          );

          if (!enriched) {
            throw new Error("AI enrichment failed - no enriched data returned");
          }

          console.log(`[v0] STEP 3: AI enrichment completed - MetaDesc length: ${enriched.metaDescription.length}, Labels: ${enriched.labels.length}`);

          // Update article with enriched data AND change status to "enriched"
          console.log(`[v0] STEP 4: Updating article ${article.id} with enrichment data and status='enriched'...`);
          
          const { error: updateError } = await supabase
            .from("articles")
            .update({
              meta_description: enriched.metaDescription,
              meta_keywords: enriched.metaKeywords,
              ai_generated_labels: enriched.labels,
              summary: enriched.summary,
              status: "enriched", // Mark as enriched
            })
            .eq("id", article.id);

          if (updateError) {
            console.error(`[v0] ERROR updating article ${article.id}: ${updateError.message}`);
            throw updateError;
          }

          console.log(`[v0] STEP 5: Article ${article.id} successfully updated with enrichment data and status=enriched`);

          await logArticleHistory(article.id, "enriched", "success", {
            metaDescription: enriched.metaDescription,
            labelsCount: enriched.labels.length,
          });

          enrichedProcessedCount++;

          // Check if auto-publish is enabled
          console.log(`[v0] STEP 6: Checking auto-publish configuration...`);
          
          const { data: config } = await supabase
            .from("system_config")
            .select("config_value")
            .eq("config_key", "auto_publish_drafts")
            .single();

          const autoPublish = config?.config_value === "true";
          console.log(`[v0] STEP 6b: auto_publish_drafts = ${autoPublish}`);

          if (autoPublish && article.title && enriched.metaDescription) {
            // Create Blogger post
            console.log(`[v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post for "${article.title}"`);
            const bloggerResult = await createBloggerPost({
              title: article.title,
              content: article.content || "",
              labels: enriched.labels,
              isDraft: false, // Not a draft if we're publishing
            });

            if (bloggerResult && bloggerResult.postId) {
              console.log(`[v0] STEP 8: Blogger post created successfully. PostId: ${bloggerResult.postId}`);
              
              // Update article with Blogger post info
              const { error: publishError } = await supabase
                .from("articles")
                .update({
                  blogger_post_id: bloggerResult.postId,
                  blogger_published_at: new Date().toISOString(),
                  blogger_draft: false,
                  status: "published",
                })
                .eq("id", article.id);

              if (publishError) {
                console.error(`[v0] ERROR updating article status to published: ${publishError.message}`);
                throw publishError;
              }

              console.log(`[v0] STEP 9: Article ${article.id} status updated to published. PostId: ${bloggerResult.postId}`);

              await logArticleHistory(article.id, "published", "success", {
                bloggerPostId: bloggerResult.postId,
                bloggerUrl: bloggerResult.url,
              });

              publishedCount++;
            } else {
              const errorMsg = bloggerResult?.error || "Failed to create Blogger post";
              console.error(`[v0] Blogger post creation failed: ${errorMsg}`);
              throw new Error(errorMsg);
            }
          } else if (!autoPublish) {
            // Create as draft for manual review
            console.log(`[v0] STEP 7: AUTO-PUBLISH disabled. Creating Blogger DRAFT for "${article.title}"`);
            const bloggerResult = await createBloggerPost({
              title: article.title,
              content: article.content || "",
              labels: enriched.labels,
              isDraft: true,
            });

            if (bloggerResult && bloggerResult.postId) {
              console.log(`[v0] STEP 8: Blogger draft created. PostId: ${bloggerResult.postId}`);
              
              const { error: draftError } = await supabase
                .from("articles")
                .update({
                  blogger_post_id: bloggerResult.postId,
                  blogger_draft: true,
                  status: "published",
                })
                .eq("id", article.id);

              if (draftError) {
                console.error(`[v0] ERROR updating article with draft info: ${draftError.message}`);
                throw draftError;
              }

              console.log(`[v0] STEP 9: Article ${article.id} updated with draft info. PostId: ${bloggerResult.postId}`);

              await logArticleHistory(
                article.id,
                "published",
                "draft_created",
                {
                  bloggerPostId: bloggerResult.postId,
                }
              );

              publishedCount++;
            } else {
              const errorMsg = bloggerResult?.error || "Failed to create Blogger draft";
              console.error(`[v0] Blogger draft creation failed: ${errorMsg}`);
              throw new Error(errorMsg);
            }
          } else {
            console.log(`[v0] STEP 7: Cannot publish - missing title or metaDescription. Title: "${article.title}", MetaDesc exists: ${!!enriched.metaDescription}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[v0] ERROR processing article ${article.id}: ${errorMsg}`);

          const { error: updateError } = await supabase
            .from("articles")
            .update({
              status: "failed",
              error_message: errorMsg,
            })
            .eq("id", article.id);

          if (updateError) {
            console.error(`[v0] Failed to update article status to 'failed': ${updateError.message}`);
          }

          await logArticleHistory(article.id, "failed", "enrichment_error", { error: errorMsg }, errorMsg);

          errors.push(`Article ${article.id}: ${errorMsg}`);
        }
      }
    }

    await logCronJob("enrich-and-publish", "success", {
      articlesProcessed: enrichedProcessedCount,
      articlesPublished: publishedCount,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        enrichedProcessedCount,
        publishedCount,
        errorsCount: errors.length,
      },
    });

    console.log(
      `[v0] Enrichment completed. Enriched: ${enrichedProcessedCount}, Published: ${publishedCount}`
    );

    return NextResponse.json({
      success: true,
      enrichedProcessedCount,
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
