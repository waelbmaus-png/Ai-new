'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  articles_processed: number;
  articles_published: number;
  error_message: string | null;
  created_at: string;
}

export default function CronLogs() {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ limit: '50' });
        if (selectedJob) params.append('jobName', selectedJob);

        const response = await fetch(`/api/cron-logs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch cron logs');
        const data = await response.json();
        setLogs(data.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, [selectedJob]);

  if (loading) return <div className="text-center py-8">Loading logs...</div>;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const jobNames = Array.from(
    new Set(logs.map((log) => log.job_name))
  ).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cron Job Logs</CardTitle>
        <CardDescription>
          Track automated task execution and results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-600 py-4">Error: {error}</div>}

        {/* Filter by job name */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedJob('')}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedJob === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            All Jobs
          </button>
          {jobNames.map((name) => (
            <button
              key={name}
              onClick={() => setSelectedJob(name)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedJob === name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Logs table */}
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            No cron logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Job</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Articles</th>
                  <th className="text-left py-2">Executed</th>
                  <th className="text-left py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const startTime = log.started_at
                    ? new Date(log.started_at)
                    : null;
                  const endTime = log.completed_at
                    ? new Date(log.completed_at)
                    : null;
                  const duration =
                    startTime && endTime
                      ? `${(
                          (endTime.getTime() -
                            startTime.getTime()) /
                          1000
                        ).toFixed(1)}s`
                      : '—';

                  return (
                    <tr
                      key={log.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 font-medium">
                        {log.job_name}
                      </td>
                      <td className="py-3">
                        <Badge className={statusBadge(log.status)}>
                          {log.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm">
                        {log.articles_processed > 0 && (
                          <span>
                            {log.articles_processed} processed
                            {log.articles_published > 0 &&
                              `, ${log.articles_published} published`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-gray-600">
                        <div>
                          {new Date(log.created_at).toLocaleDateString()}{' '}
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                        {duration !== '—' && (
                          <div>Duration: {duration}</div>
                        )}
                      </td>
                      <td className="py-3">
                        {log.error_message ? (
                          <span className="text-red-600 text-xs font-medium">
                            {log.error_message.substring(0, 50)}
                            {log.error_message.length > 50 &&
                              '...'}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
