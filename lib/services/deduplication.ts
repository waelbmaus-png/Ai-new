import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import md5 from "md5";

interface ArticleForDedup {
  id: string;
  title: string;
  url: string;
  content?: string;
}

interface DeduplicationResult {
  isDuplicate: boolean;
  duplicateOfId?: string;
  similarityScore?: number;
  strategy: "hash" | "content";
}

// Hash-based deduplication
function hashString(str: string): string {
  return md5(str.toLowerCase().trim());
}

function generateUrlHash(url: string): string {
  return hashString(url);
}

function generateTitleHash(title: string): string {
  return hashString(title);
}

function generateContentHash(content: string): string {
  return crypto
    .createHash("sha256")
    .update(content.toLowerCase().trim())
    .digest("hex");
}

// Simple content similarity using Jaccard similarity
function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = new Set(
    text1.toLowerCase().match(/\b\w+\b/g) || []
  );
  const tokens2 = new Set(
    text2.toLowerCase().match(/\b\w+\b/g) || []
  );

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set(
    [...tokens1].filter((x) => tokens2.has(x))
  );
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}

// Quick hash-based check for exact duplicates
async function checkHashDuplicates(
  article: ArticleForDedup
): Promise<DeduplicationResult | null> {
  const supabase = await createClient();
  const urlHash = generateUrlHash(article.url);
  const titleHash = generateTitleHash(article.title);

  // Check if URL already exists
  const { data: urlMatch } = await supabase
    .from("deduplication_records")
    .select("article_id")
    .eq("url_hash", urlHash)
    .single();

  if (urlMatch) {
    return {
      isDuplicate: true,
      duplicateOfId: urlMatch.article_id,
      strategy: "hash",
    };
  }

  // Check if similar title/hash combination exists
  const { data: titleMatches } = await supabase
    .from("deduplication_records")
    .select("article_id")
    .eq("title_hash", titleHash)
    .limit(5);

  if (titleMatches && titleMatches.length > 0) {
    // Additional content check would go here
    return {
      isDuplicate: true,
      duplicateOfId: titleMatches[0].article_id,
      strategy: "hash",
    };
  }

  return null;
}

// Content-based similarity check
async function checkContentDuplicates(
  article: ArticleForDedup,
  similarityThreshold: number = 0.75
): Promise<DeduplicationResult | null> {
  if (!article.content) return null;

  const supabase = await createClient();
  const contentHash = generateContentHash(article.content);

  // First, try exact content hash match
  const { data: exactMatch } = await supabase
    .from("deduplication_records")
    .select("article_id")
    .eq("content_hash", contentHash)
    .single();

  if (exactMatch) {
    return {
      isDuplicate: true,
      duplicateOfId: exactMatch.article_id,
      similarityScore: 1.0,
      strategy: "content",
    };
  }

  // Check content similarity with recent articles
  const { data: recentArticles } = await supabase
    .from("articles")
    .select("id, content")
    .is("content", "not.is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (recentArticles && recentArticles.length > 0) {
    for (const existing of recentArticles) {
      const similarity = calculateSimilarity(
        article.content,
        existing.content
      );

      if (similarity >= similarityThreshold) {
        return {
          isDuplicate: true,
          duplicateOfId: existing.id,
          similarityScore: similarity,
          strategy: "content",
        };
      }
    }
  }

  return null;
}

export async function deduplicateArticle(
  article: ArticleForDedup,
  similarityThreshold: number = 0.75
): Promise<DeduplicationResult> {
  // First try hash-based deduplication
  const hashResult = await checkHashDuplicates(article);
  if (hashResult) {
    return hashResult;
  }

  // Then try content-based deduplication
  const contentResult = await checkContentDuplicates(
    article,
    similarityThreshold
  );
  if (contentResult) {
    return contentResult;
  }

  // Not a duplicate
  return {
    isDuplicate: false,
    strategy: "hash",
  };
}

export async function recordDeduplicationCheck(
  articleId: string,
  rawArticleId: string,
  article: ArticleForDedup,
  result: DeduplicationResult
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("deduplication_records")
    .insert({
      article_id: articleId,
      raw_article_id: rawArticleId,
      url_hash: generateUrlHash(article.url),
      title_hash: generateTitleHash(article.title),
      content_hash: article.content
        ? generateContentHash(article.content)
        : null,
      similarity_score: result.similarityScore || null,
      is_duplicate: result.isDuplicate,
      duplicate_of_article_id: result.duplicateOfId || null,
    });

  if (error) {
    console.error("[v0] Error recording deduplication check:", error);
  }
}
