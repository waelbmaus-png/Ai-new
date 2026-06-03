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

  const { error } = await supabase
    .from("raw_articles")
    .insert(
      articles.map((article) => ({
        feed_id: article.feedId,
        title: article.title,
        url: article.url,
        content: article.content,
        author: article.author,
        published_at: article.publishedAt?.toISOString(),
        source_guid: article.sourceGuid,
      }))
    );

  if (error) {
    console.error("[v0] Error saving raw articles:", error);
    throw error;
  }

  console.log(`[v0] Saved ${articles.length} raw articles`);
}

export async function getActiveRSSFeeds(): Promise<
  Array<{ id: string; name: string; url: string }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rss_feeds")
    .select("id, name, url")
    .eq("active", true);

  if (error) {
    console.error("[v0] Error fetching RSS feeds:", error);
    throw error;
  }

  return data || [];
}
