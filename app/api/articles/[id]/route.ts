import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateBloggerPost, publishBloggerPost } from "@/lib/services/blogger-api";
import { logArticleHistory } from "@/lib/services/history-logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data: article, error } = await supabase
      .from("articles")
      .select(
        "*, article_history(id, action, status, created_at, error)"
      )
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(`Article not found: ${error.message}`);
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("[v0] Error fetching article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch article",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const body = await request.json();
    const {
      title,
      content,
      metaDescription,
      metaKeywords,
      labels,
      publish,
    } = body;

    // Update article
    const { error: updateError } = await supabase
      .from("articles")
      .update({
        title,
        content,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        labels,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Failed to update article: ${updateError.message}`);
    }

    // Publish to Blogger if requested
    if (publish) {
      const { data: article } = await supabase
        .from("articles")
        .select("blogger_post_id, blogger_draft")
        .eq("id", id)
        .single();

      if (article?.blogger_post_id) {
        if (article.blogger_draft) {
          // Publish the existing draft
          const success = await publishBloggerPost(
            article.blogger_post_id
          );

          if (success) {
            await supabase
              .from("articles")
              .update({
                blogger_draft: false,
                blogger_published_at: new Date().toISOString(),
                status: "published",
              })
              .eq("id", id);

            await logArticleHistory(id, "published", "draft_published");
          }
        }
      }
    }

    const { data: updated } = await supabase
      .from("articles")
      .select("*")
      .eq("id", id)
      .single();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[v0] Error updating article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update article",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { error } = await supabase
      .from("articles")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete article: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] Error deleting article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete article",
      },
      { status: 500 }
    );
  }
}
