import { createClient } from "@/lib/supabase/server";
import Parser from "rss-parser";

interface RawArticleData {
  feedId: string;
  title: string;
  url: string;
  content?: string;
  author?: string;
  publishedAt?: Date;
  sourceGuid?: string;
}

export async function fetchRSSFeed(
  feedUrl: string,
  feedId: string
): Promise<RawArticleData[]> {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL(feedUrl);

    const articles: RawArticleData[] = (feed.items || []).map((item) => ({
      feedId,
      title: item.title || "Untitled",
      url: item.link || "",
      content: item.content || item.contentSnippet || "",
      author: item.author || item.creator || "",
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      sourceGuid: item.guid || item.id || item.link || "",
    }));

    return articles;
  } catch (error) {
    console.error(`[v0] Error parsing feed ${feedUrl}:`, error);
    throw error;
  }
}

export async function saveRawArticles(
  articles: RawArticleData[]
): Promise<void> {
  if (articles.length === 0) return;

  const supabase = await createClient();

  const payload = articles.map((article) => ({
    feed_id: article.feedId,
    title: article.title,
    url: article.url,
    content: article.content,
    author: article.author,
    published_at: article.publishedAt?.toISOString(),
    source_guid: article.sourceGuid,
  }));

  console.log("[v0] Inserting articles into raw_articles table");
  console.log("[v0] Payload sample:", JSON.stringify(payload[0], null, 2));
  console.log(`[v0] Total articles to insert: ${payload.length}`);

  const { error } = await supabase
    .from("raw_articles")
    .insert(payload);

  if (error) {
    console.error("[v0] DETAILED ERROR: Supabase insert failed");
    console.error("[v0] Error code:", error.code);
    console.error("[v0] Error message:", error.message);
    console.error("[v0] Error details:", error.details);
    console.error("[v0] Error hint:", error.hint);
    console.error("[v0] Full error object:", JSON.stringify(error, null, 2));
    console.error("[v0] Failed payload:", JSON.stringify(payload, null, 2));
    throw error;
  }

  console.log(`[v0] Successfully saved ${articles.length} raw articles`);
}

export async function getActiveRSSFeeds(): Promise<
  Array<{ id: string; name: string; url: string }>
> {
  const supabase = await createClient();

  console.log("[v0] Fetching active RSS feeds from rss_feeds table");
  const { data, error } = await supabase
    .from("rss_feeds")
    .select("id, name, url")
    .eq("active", true);

  if (error) {
    console.error("[v0] DETAILED ERROR: Failed to fetch feeds");
    console.error("[v0] Error code:", error.code);
    console.error("[v0] Error message:", error.message);
    console.error("[v0] Error details:", error.details);
    console.error("[v0] Error hint:", error.hint);
    throw error;
  }

  console.log(`[v0] Successfully fetched ${data?.length || 0} active feeds`);
  return data || [];
}
