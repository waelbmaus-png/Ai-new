import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const jobName = searchParams.get("jobName");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * limit;

    let query = supabase
      .from("cron_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (jobName) {
      query = query.eq("job_name", jobName);
    }

    const { data: logs, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch cron logs: ${error.message}`);
    }

    return NextResponse.json({
      logs,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("[v0] Error fetching cron logs:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch cron logs",
      },
      { status: 500 }
    );
  }
}
