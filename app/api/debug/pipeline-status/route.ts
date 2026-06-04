import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[v0] PIPELINE STATUS: Checking article pipeline status...');
    
    const supabase = await createClient();

    // Get counts by status
    const statuses = ['pending', 'deduped', 'enriched', 'published', 'failed'];
    const statusCounts: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from('articles')
        .select('id', { count: 'exact' })
        .eq('status', status);
      
      statusCounts[status] = count || 0;
      console.log(`[v0] Articles with status='${status}': ${count || 0}`);
    }

    // Get articles needing enrichment (status=deduped, no meta_description)
    const { data: needsEnrichment, error: enrichmentError } = await supabase
      .from('articles')
      .select('id, title, status, meta_description')
      .eq('status', 'deduped')
      .is('meta_description', null)
      .limit(5);

    console.log(`[v0] Articles needing enrichment: ${needsEnrichment?.length || 0}`);

    // Get articles needing publication (status=enriched, no blogger_post_id)
    const { data: needsPublication, error: publicationError } = await supabase
      .from('articles')
      .select('id, title, status, blogger_post_id, blogger_draft')
      .eq('status', 'enriched')
      .is('blogger_post_id', null)
      .limit(5);

    console.log(`[v0] Articles needing publication: ${needsPublication?.length || 0}`);

    // Get failed articles
    const { data: failedArticles, error: failedError } = await supabase
      .from('articles')
      .select('id, title, status, error_message')
      .eq('status', 'failed')
      .limit(5);

    console.log(`[v0] Failed articles: ${failedArticles?.length || 0}`);

    // Get recent cron logs
    const { data: cronLogs, error: cronError } = await supabase
      .from('cron_logs')
      .select('job_name, status, articles_processed, articles_published, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`[v0] Recent cron logs: ${cronLogs?.length || 0}`);

    return NextResponse.json({
      success: true,
      summary: {
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        byStatus: statusCounts,
      },
      pipeline: {
        needsEnrichment: needsEnrichment?.length || 0,
        needsPublication: needsPublication?.length || 0,
        failed: failedArticles?.length || 0,
      },
      details: {
        articlesNeedingEnrichment: needsEnrichment || [],
        articlesNeedingPublication: needsPublication || [],
        failedArticles: failedArticles || [],
      },
      cronHistory: (cronLogs || []).slice(0, 5).map(log => ({
        job: log.job_name,
        status: log.status,
        processed: log.articles_processed,
        published: log.articles_published,
        error: log.error_message,
        time: log.created_at,
      })),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[v0] PIPELINE STATUS: ERROR:', errorMsg);
    
    return NextResponse.json({
      success: false,
      error: 'Pipeline status check failed',
      details: errorMsg,
    }, { status: 500 });
  }
}
