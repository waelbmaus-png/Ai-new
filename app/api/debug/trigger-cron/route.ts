import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { job } = body;

    if (!job) {
      return NextResponse.json({
        error: 'Missing job parameter',
        available: ['fetch-feeds', 'deduplicate', 'enrich-and-publish'],
      }, { status: 400 });
    }

    console.log(`[v0] Triggering cron job: ${job}`);

    const cronSecret = process.env.CRON_SECRET;
    const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cron/${job}`;

    console.log(`[v0] Calling: ${jobUrl}`);

    const response = await fetch(jobUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggered: true }),
    });

    const result = await response.json();

    console.log(`[v0] Cron job ${job} completed with status: ${response.status}`);

    return NextResponse.json({
      success: response.ok,
      job,
      status: response.status,
      result,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[v0] Trigger cron error:', errorMsg);
    
    return NextResponse.json({
      error: 'Failed to trigger cron job',
      details: errorMsg,
    }, { status: 500 });
  }
}
