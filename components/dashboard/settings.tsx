'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Settings() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const cronSecret = process.env.NEXT_PUBLIC_CRON_SECRET || 'Not set';
  const cronJobs = [
    {
      name: 'Fetch RSS Feeds',
      endpoint: '/api/cron/fetch-feeds',
      schedule: 'Every 4 hours',
      description: 'Fetches new articles from configured RSS feeds',
    },
    {
      name: 'Deduplicate Articles',
      endpoint: '/api/cron/deduplicate',
      schedule: 'Every 6 hours',
      description: 'Removes duplicate articles using hash and content similarity',
    },
    {
      name: 'Enrich & Publish',
      endpoint: '/api/cron/enrich-and-publish',
      schedule: 'Every 8 hours',
      description: 'Enriches articles with AI-generated SEO metadata and publishes to Blogger',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Follow these steps to configure the AI News Automation System
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Blogger API */}
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">Step 1: Setup Blogger API</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Go to{' '}
                <a
                  href="https://console.cloud.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Create a new project</li>
              <li>Enable the Blogger API</li>
              <li>Create OAuth 2.0 credentials (Desktop application)</li>
              <li>Save your Client ID and Client Secret</li>
              <li>Get your Blog ID from your Blogger blog URL</li>
              <li>Update the system configuration with these values</li>
            </ol>
          </div>

          {/* Step 2: OpenRouter API */}
          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">Step 2: Setup OpenRouter API</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                Sign up for{' '}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  OpenRouter
                </a>
              </li>
              <li>Create an API key</li>
              <li>Add it to your environment variables as OPENROUTER_API_KEY</li>
            </ol>
          </div>

          {/* Step 3: Vercel Cron */}
          <div className="border-l-4 border-purple-500 pl-4 py-2">
            <h3 className="font-bold text-lg mb-2">Step 3: Setup Vercel Cron Jobs</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to your Vercel project settings</li>
              <li>Create a new Cron Secret for CRON_SECRET</li>
              <li>In Vercel dashboard, go to Crons</li>
              <li>Create cron jobs for each endpoint below with the schedule</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Cron Job Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Vercel Cron Jobs</CardTitle>
          <CardDescription>
            Configure these endpoints in Vercel Crons dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authorization Header Required</AlertTitle>
            <AlertDescription>
              All cron endpoints require the header:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded">
                Authorization: Bearer {cronSecret}
              </code>
            </AlertDescription>
          </Alert>

          {cronJobs.map((job, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 space-y-3"
            >
              <div>
                <h3 className="font-bold">{job.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {job.description}
                </p>
              </div>

              <div className="space-y-2 bg-gray-50 p-3 rounded">
                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Endpoint
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white border rounded px-3 py-2 text-sm font-mono">
                      {job.endpoint}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}${job.endpoint}`,
                          `endpoint-${idx}`
                        )
                      }
                    >
                      {copied === `endpoint-${idx}` ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Schedule
                  </label>
                  <div className="bg-white border rounded px-3 py-2 text-sm">
                    {job.schedule}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700">
                    Method
                  </label>
                  <div className="bg-white border rounded px-3 py-2 text-sm font-mono">
                    POST
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Required Environment Variables</CardTitle>
          <CardDescription>
            Add these to your Vercel project settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                key: 'OPENROUTER_API_KEY',
                description: 'Your OpenRouter API key for AI enrichment',
              },
              {
                key: 'CRON_SECRET',
                description: 'Secret for protecting cron endpoints',
              },
              {
                key: 'NEXT_PUBLIC_SUPABASE_URL',
                description: 'Your Supabase project URL',
              },
              {
                key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                description: 'Your Supabase anon key',
              },
            ].map((env, idx) => (
              <div
                key={idx}
                className="border rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {env.key}
                  </code>
                </div>
                <p className="text-sm text-gray-600">{env.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Database Configuration</CardTitle>
          <CardDescription>
            System tables and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm">
              <strong>Database:</strong> Supabase PostgreSQL
            </p>
            <p className="text-sm mt-2">
              <strong>Tables:</strong> rss_feeds, raw_articles, articles,
              deduplication_records, article_history, cron_logs,
              system_config
            </p>
            <p className="text-sm mt-2">
              All configuration is stored in the{' '}
              <code className="bg-white px-2 py-1 rounded font-mono">
                system_config
              </code>{' '}
              table.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
