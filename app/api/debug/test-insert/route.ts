import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log("[v0] Testing article insert...");

    // Test insert into articles
    const testArticle = {
      title: "Test Article - " + Date.now(),
      url: "https://test-article-" + Date.now() + ".com",
      content: "This is a test article to verify Supabase inserts are working",
      status: "pending",
    };

    console.log("[v0] Inserting test article:", testArticle);

    const { data, error } = await supabase
      .from("articles")
      .insert(testArticle)
      .select()
      .single();

    if (error) {
      console.error("[v0] Error inserting article:", error);
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 500 }
      );
    }

    console.log("[v0] Successfully inserted article:", data);

    // Test insert into deduplication_records
    if (data?.id) {
      const dedupRecord = {
        article_id: data.id,
        raw_article_id: "00000000-0000-0000-0000-000000000000", // dummy UUID
        url_hash: "testhash",
        title_hash: "testhash",
        content_hash: null,
        similarity_score: null,
        is_duplicate: false,
        duplicate_of_article_id: null,
      };

      console.log("[v0] Inserting deduplication record:", dedupRecord);

      const { data: dedupData, error: dedupError } = await supabase
        .from("deduplication_records")
        .insert(dedupRecord)
        .select()
        .single();

      if (dedupError) {
        console.error("[v0] Error inserting dedup record:", dedupError);
        return NextResponse.json(
          {
            articleInserted: true,
            articleData: data,
            dedupError: dedupError.message,
            dedupCode: dedupError.code,
          },
          { status: 500 }
        );
      }

      console.log("[v0] Successfully inserted dedup record:", dedupData);

      return NextResponse.json({
        success: true,
        article: data,
        dedupRecord: dedupData,
        message: "Both inserts succeeded",
      });
    }

    return NextResponse.json({
      success: true,
      article: data,
      message: "Article insert succeeded",
    });
  } catch (error) {
    console.error("[v0] Test endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
