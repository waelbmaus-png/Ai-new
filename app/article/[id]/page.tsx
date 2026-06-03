'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Send } from 'lucide-react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  url: string;
  content: string;
  summary: string;
  meta_description: string;
  meta_keywords: string[];
  ai_generated_labels: string[];
  labels: string[];
  status: string;
  blogger_post_id: string;
  blogger_draft: boolean;
  article_history: any[];
}

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    metaDescription: '',
    labels: [] as string[],
  });

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${id}`);
        if (!response.ok) throw new Error('Failed to fetch article');
        const data = await response.json();
        setArticle(data);
        setFormData({
          title: data.title,
          content: data.content || '',
          metaDescription: data.meta_description || '',
          labels: data.labels || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchArticle();
  }, [id]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          metaDescription: formData.metaDescription,
          labels: formData.labels,
        }),
      });

      if (!response.ok) throw new Error('Failed to save article');
      alert('Article saved successfully!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          metaDescription: formData.metaDescription,
          labels: formData.labels,
          publish: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to publish article');
      alert('Article published!');
      router.push('/');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading article...</div>;
  if (error) return <div className="text-red-600 py-8">Error: {error}</div>;
  if (!article) return <div className="text-center py-8">Article not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Article</h1>
            <p className="text-gray-600">ID: {id}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Editor */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        title: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        content: e.target.value,
                      })
                    }
                    rows={10}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Meta Description (SEO)
                  </label>
                  <Textarea
                    value={formData.metaDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metaDescription: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Brief description for search engines"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.metaDescription.length}/160 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {article.blogger_draft && (
                <Button
                  onClick={handlePublish}
                  disabled={saving}
                  variant="default"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publish to Blog
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    Article Status
                  </label>
                  <Badge className="mt-1">{article.status}</Badge>
                </div>
                {article.blogger_post_id && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">
                      Blogger Status
                    </label>
                    <Badge
                      variant={article.blogger_draft ? 'outline' : 'default'}
                      className="mt-1"
                    >
                      {article.blogger_draft ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Labels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Labels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">
                    AI Generated
                  </label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {article.ai_generated_labels?.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    )) || <span className="text-xs text-gray-600">None</span>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {article.article_history?.map((entry) => (
                    <div
                      key={entry.id}
                      className="text-xs p-2 bg-gray-50 rounded"
                    >
                      <p className="font-medium capitalize">
                        {entry.action}
                      </p>
                      <p className="text-gray-600">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                      {entry.error && (
                        <p className="text-red-600 text-xs mt-1">
                          Error: {entry.error}
                        </p>
                      )}
                    </div>
                  )) || (
                    <span className="text-xs text-gray-600">
                      No history
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 text-xs break-all hover:underline"
                >
                  {article.url}
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
