'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ExecutionResult {
  success: boolean;
  successCount?: number;
  errorCount?: number;
  executionTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export default function PipelineControls() {
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cronSecret, setCronSecret] = useState('');
  const [showSecretDialog, setShowSecretDialog] = useState(false);

  const executeCron = async (endpoint: string, name: string) => {
    try {
      setExecuting(name);
      setResult(null);

      const startTime = Date.now();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret || process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });

      const executionTime = Date.now() - startTime;
      const data = await response.json();

      setResult({
        success: response.ok,
        successCount: data.processedCount || data.articlesProcessed || data.enrichedProcessedCount || 0,
        errorCount: data.errors?.length || (data.error ? 1 : 0),
        executionTime,
        message: data.error || (response.ok ? `${name} completed successfully` : `${name} failed`),
        details: data,
      });
      setShowResult(true);
    } catch (error) {
      setResult({
        success: false,
        errorCount: 1,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      setShowResult(true);
    } finally {
      setExecuting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Controls</CardTitle>
          <CardDescription>Manually trigger pipeline jobs for testing and debugging</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={() => executeCron('/api/cron/fetch-feeds', 'Fetch Feeds')}
              disabled={executing !== null}
              className="w-full"
              variant="outline"
            >
              {executing === 'Fetch Feeds' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Fetch Now
                </>
              )}
            </Button>

            <Button
              onClick={() => executeCron('/api/cron/deduplicate', 'Deduplication')}
              disabled={executing !== null}
              className="w-full"
              variant="outline"
            >
              {executing === 'Deduplication' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deduplicating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Deduplication Now
                </>
              )}
            </Button>

            <Button
              onClick={() => executeCron('/api/cron/enrich-and-publish', 'Enrichment')}
              disabled={executing !== null}
              className="w-full"
              variant="outline"
            >
              {executing === 'Enrichment' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enriching...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Enrichment Now
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowSecretDialog(true)}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Set Cron Secret
            </Button>
          </div>

          {showResult && result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                    {result.message}
                  </p>
                  {result.successCount !== undefined && result.successCount > 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      Processed: {result.successCount} items
                    </p>
                  )}
                  {result.errorCount !== undefined && result.errorCount > 0 && (
                    <p className="text-sm text-red-700 mt-1">
                      Errors: {result.errorCount}
                    </p>
                  )}
                  {result.executionTime !== undefined && (
                    <p className="text-sm text-gray-600 mt-1">
                      Execution time: {(result.executionTime / 1000).toFixed(2)}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showSecretDialog} onOpenChange={setShowSecretDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Cron Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your CRON_SECRET to authenticate pipeline executions
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="password"
            value={cronSecret}
            onChange={(e) => setCronSecret(e.target.value)}
            placeholder="Enter cron secret..."
            className="w-full px-3 py-2 border rounded-md"
          />
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowSecretDialog(false)}>
              Done
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
