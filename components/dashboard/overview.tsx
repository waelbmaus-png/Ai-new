'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Rss, FileText } from 'lucide-react';
import PipelineControls from './pipeline-controls';

interface DashboardStats {
  pipeline: {
    rawArticles: number;
    processedArticles: number;
    publishedArticles: number;
  };
  stats: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    pendingArticles: number;
    totalFeeds: number;
    activeFeeds: number;
  };
  statusCounts: Record<string, number>;
  recentCrons: any[];
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-8">Loading statistics...</div>;
  if (error) return <div className="text-red-600 py-8">Error: {error}</div>;
  if (!stats) return null;

  const { pipeline, stats: data, statusCounts, recentCrons } = stats;

  return (
    <div className="grid gap-4">
      {/* Pipeline Statistics */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Processing Pipeline</CardTitle>
          <CardDescription>Data flow from feeds through to publication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Raw Articles</p>
              <p className="text-3xl font-bold text-blue-600">{pipeline.rawArticles}</p>
              <p className="text-xs text-gray-500 mt-1">From RSS feeds</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="text-gray-400 text-2xl mb-2">→</div>
              <p className="text-xs text-gray-500">Deduplication</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Processed Articles</p>
              <p className="text-3xl font-bold text-green-600">{pipeline.processedArticles}</p>
              <p className="text-xs text-gray-500 mt-1">Unique, enriched</p>
            </div>
            <div className="flex flex-col items-center justify-center md:col-start-2">
              <div className="text-gray-400 text-2xl mb-2">→</div>
              <p className="text-xs text-gray-500">Enrichment & Publish</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Published Articles</p>
              <p className="text-3xl font-bold text-purple-600">{pipeline.publishedArticles}</p>
              <p className="text-xs text-gray-500 mt-1">Live on Blogger</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalArticles}</div>
            <p className="text-xs text-gray-600">All articles processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.publishedArticles}</div>
            <p className="text-xs text-gray-600">Live on blog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.draftArticles}</div>
            <p className="text-xs text-gray-600">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingArticles}</div>
            <p className="text-xs text-gray-600">In processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RSS Feeds</CardTitle>
            <Rss className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeFeeds}/{data.totalFeeds}</div>
            <p className="text-xs text-gray-600">Active/Total feeds</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Article Status</CardTitle>
            <CardDescription>Distribution by processing status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status === 'published'
                          ? 'bg-green-600'
                          : status === 'failed'
                            ? 'bg-red-600'
                            : status === 'deduped'
                              ? 'bg-blue-600'
                              : 'bg-yellow-600'
                      }`}
                      style={{
                        width: `${(count / (data.totalArticles || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Cron Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Cron Jobs</CardTitle>
            <CardDescription>Last 3 automated tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCrons.length > 0 ? (
                recentCrons.map((cron) => (
                  <div key={cron.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                    <div>
                      <p className="font-medium">{cron.job_name}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(cron.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        cron.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : cron.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {cron.status}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No recent cron jobs</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Controls */}
      <PipelineControls />
    </div>
  );
}
