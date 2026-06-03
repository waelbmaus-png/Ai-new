import { createClient } from "@/lib/supabase/server";
import { OpenAI } from "openai";

interface EnrichedArticle {
  metaDescription: string;
  metaKeywords: string[];
  labels: string[];
  summary: string;
}

async function getConfig(key: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("system_config")
    .select("config_value")
    .eq("config_key", key)
    .single();

  if (error) {
    console.error(`[v0] Error fetching config ${key}:`, error);
    return "";
  }

  return data?.config_value || "";
}

export async function enrichArticleWithAI(
  title: string,
  content: string
): Promise<EnrichedArticle | null> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn(
        "[v0] OPENROUTER_API_KEY not set, skipping AI enrichment"
      );
      return null;
    }

    // Initialize OpenAI client with OpenRouter endpoint
    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const prompt = `
You are an expert content analyst and SEO specialist. Analyze the following article and provide:
1. A concise meta description (150-160 characters) for SEO
2. 5-7 relevant keywords/topics
3. 3-5 labels for categorization (e.g., "Technology", "AI", "News")
4. A brief summary (2-3 sentences)

Article Title: ${title}
Article Content: ${content.substring(0, 2000)}

Respond in JSON format:
{
  "metaDescription": "...",
  "keywords": ["keyword1", "keyword2", ...],
  "labels": ["label1", "label2", ...],
  "summary": "..."
}
`;

    const response = await client.chat.completions.create({
      model: "openrouter/auto",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText =
      response.choices[0].message.content || "";

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[v0] Failed to parse AI response:", responseText);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      metaDescription: parsed.metaDescription || "",
      metaKeywords: parsed.keywords || [],
      labels: parsed.labels || [],
      summary: parsed.summary || "",
    };
  } catch (error) {
    console.error("[v0] Error enriching article with AI:", error);
    return null;
  }
}

export async function generateLabelsFromContent(
  title: string,
  content: string
): Promise<string[]> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return [];
    }

    const client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const response = await client.chat.completions.create({
      model: "openrouter/auto",
      messages: [
        {
          role: "user",
          content: `Generate 3-5 Blogger-friendly labels for this article. Return only the labels as a JSON array of strings.

Title: ${title}
Content: ${content.substring(0, 1000)}

Example format: ["Technology", "AI", "News"]`,
        },
      ],
      temperature: 0.6,
      max_tokens: 100,
    });

    const responseText =
      response.choices[0].message.content || "[]";

    try {
      const parsed = JSON.parse(responseText);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // Fallback: extract words from the response
      const words = responseText
        .match(/\b[A-Za-z]+\b/g)
        ?.slice(0, 5) || [];
      return words;
    }
  } catch (error) {
    console.error("[v0] Error generating labels:", error);
    return [];
  }
}

export async function saveEnrichedArticle(
  articleData: {
    title: string;
    url: string;
    content: string;
    author?: string;
    originalPublishedAt?: Date;
    metaDescription: string;
    metaKeywords: string[];
    labels: string[];
    summary: string;
  },
  status: string = "enriched"
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("articles")
    .insert({
      title: articleData.title,
      url: articleData.url,
      content: articleData.content,
      author: articleData.author,
      original_published_at: articleData.originalPublishedAt?.toISOString(),
      meta_description: articleData.metaDescription,
      meta_keywords: articleData.metaKeywords,
      ai_generated_labels: articleData.labels,
      summary: articleData.summary,
      status,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[v0] Error saving enriched article:", error);
    return null;
  }

  return data?.id || null;
}

export async function updateArticleLabels(
  articleId: string,
  labels: string[]
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("articles")
    .update({ labels })
    .eq("id", articleId);

  if (error) {
    console.error("[v0] Error updating article labels:", error);
  }
}
