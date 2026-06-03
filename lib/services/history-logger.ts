import { createClient } from "@/lib/supabase/server";

export type HistoryAction =
  | "fetched"
  | "deduped"
  | "enriched"
  | "published"
  | "failed";

export async function logArticleHistory(
  articleId: string,
  action: HistoryAction,
  status?: string,
  details?: Record<string, any>,
  error?: string
): Promise<void> {
  const supabase = await createClient();

  const { error: insertError } = await supabase
    .from("article_history")
    .insert({
      article_id: articleId,
      action,
      status,
      details: details || null,
      error,
    });

  if (insertError) {
    console.error("[v0] Error logging article history:", insertError);
  }
}

export type CronJobStatus = "running" | "success" | "failed";

export async function logCronJob(
  jobName: string,
  status: CronJobStatus,
  options?: {
    articlesProcessed?: number;
    articlesPublished?: number;
    errorMessage?: string;
    details?: Record<string, any>;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("cron_logs").insert({
    job_name: jobName,
    status,
    started_at:
      status === "running" ? new Date().toISOString() : null,
    completed_at:
      status !== "running" ? new Date().toISOString() : null,
    articles_processed: options?.articlesProcessed || 0,
    articles_published: options?.articlesPublished || 0,
    error_message: options?.errorMessage || null,
    details: options?.details || null,
  });

  if (error) {
    console.error("[v0] Error logging cron job:", error);
  }
}

export async function getArticleHistory(
  articleId: string
): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("article_history")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[v0] Error fetching article history:", error);
    return [];
  }

  return data || [];
}

export async function getCronLogs(
  jobName?: string,
  limit: number = 50
): Promise<any[]> {
  const supabase = await createClient();

  let query = supabase
    .from("cron_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (jobName) {
    query = query.eq("job_name", jobName);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[v0] Error fetching cron logs:", error);
    return [];
  }

  return data || [];
}
