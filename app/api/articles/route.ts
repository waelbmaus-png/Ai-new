import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("articles")
      .select("*, article_history(*)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%`
      );
    }

    const { data: articles, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch articles: ${error.message}`);
    }

    return NextResponse.json({
      articles,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("[v0] Error fetching articles:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch articles",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const {
      title,
      url,
      content,
      metaDescription,
      metaKeywords,
      labels,
    } = body;

    const { data, error } = await supabase
      .from("articles")
      .insert({
        title,
        url,
        content,
        meta_description: metaDescription,
        meta_keywords: metaKeywords,
        labels,
        status: "enriched",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create article: ${error.message}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[v0] Error creating article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create article",
      },
      { status: 500 }
    );
  }
}
