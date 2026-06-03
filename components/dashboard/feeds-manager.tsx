'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Trash2, Plus, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Feed {
  id: string;
  name: string;
  url: string;
  category: string;
  active: boolean;
  refresh_interval_hours: number;
  last_fetched_at: string | null;
  created_at: string;
}

export default function FeedsManager() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    category: '',
    refreshIntervalHours: 4,
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchFeeds();
  }, []);

  const fetchFeeds = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/feeds');
      if (!response.ok) throw new Error('Failed to fetch feeds');
      const data = await response.json();
      setFeeds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeed),
      });
      if (!response.ok) throw new Error('Failed to add feed');
      setNewFeed({ name: '', url: '', category: '', refreshIntervalHours: 4 });
      setIsOpen(false);
      fetchFeeds();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteFeed = async (id: string) => {
    if (!confirm('Delete this RSS feed?')) return;
    try {
      const response = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete feed');
      setFeeds(feeds.filter((f) => f.id !== id));
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const runFetchJob = async () => {
    try {
      const response = await fetch('/api/cron/fetch-feeds', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });
      if (!response.ok) throw new Error('Failed to run fetch job');
      alert('Fetch job started!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading && feeds.length === 0) {
    return <div className="text-center py-8">Loading feeds...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>RSS Feeds</CardTitle>
          <CardDescription>Manage your RSS feed sources</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runFetchJob}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Fetch Now
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Feed
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add RSS Feed</DialogTitle>
                <DialogDescription>
                  Add a new RSS feed to automatically fetch articles
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Feed Name</label>
                  <Input
                    placeholder="e.g., TechCrunch"
                    value={newFeed.name}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Feed URL</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/feed.xml"
                    value={newFeed.url}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, url: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category (Optional)</label>
                  <Input
                    placeholder="e.g., Technology"
                    value={newFeed.category}
                    onChange={(e) =>
                      setNewFeed({ ...newFeed, category: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" className="w-full">
                  Add Feed
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-600 py-4">Error: {error}</div>}

        {feeds.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No RSS feeds configured. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{feed.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{feed.url}</p>
                  <div className="flex gap-2 mt-2">
                    {feed.category && (
                      <Badge variant="outline">{feed.category}</Badge>
                    )}
                    <Badge variant={feed.active ? 'default' : 'secondary'}>
                      {feed.active ? 'Active' : 'Inactive'}
                    </Badge>
                    {feed.last_fetched_at && (
                      <span className="text-xs text-gray-600">
                        Last fetched:{' '}
                        {new Date(feed.last_fetched_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteFeed(feed.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
