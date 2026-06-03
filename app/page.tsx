'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardOverview from '@/components/dashboard/overview';
import ArticlesList from '@/components/dashboard/articles-list';
import FeedsManager from '@/components/dashboard/feeds-manager';
import CronLogs from '@/components/dashboard/cron-logs';
import Settings from '@/components/dashboard/settings';

export default function Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">AI News Automation System</h1>
          <p className="text-gray-600 mt-2">
            Automate your Blogger content with RSS feeds, AI enrichment, and intelligent deduplication
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="feeds">Feeds</TabsTrigger>
            <TabsTrigger value="cron-logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DashboardOverview />
          </TabsContent>

          <TabsContent value="articles">
            <ArticlesList />
          </TabsContent>

          <TabsContent value="feeds">
            <FeedsManager />
          </TabsContent>

          <TabsContent value="cron-logs">
            <CronLogs />
          </TabsContent>

          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
