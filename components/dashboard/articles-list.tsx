'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Send } from 'lucide-react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  url: string;
  status: string;
  blogger_post_id?: string;
  blogger_draft: boolean;
  created_at: string;
  meta_description?: string;
}

export default function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (status && status !== 'all') params.append('status', status);
        if (search) params.append('search', search);

        const response = await fetch(`/api/articles?${params}`);
        if (!response.ok) throw new Error('Failed to fetch articles');
        const data = await response.json();
        setArticles(data.articles);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchArticles, 300);
    return () => clearTimeout(debounce);
  }, [status, search, page, limit]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return;
    try {
      const response = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete article');
      setArticles(articles.filter((a) => a.id !== id));
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'enriched':
        return 'bg-blue-100 text-blue-800';
      case 'deduped':
        return 'bg-purple-100 text-purple-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && articles.length === 0) {
    return <div className="text-center py-8">Loading articles...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Articles</CardTitle>
        <CardDescription>Manage your published and draft articles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1"
          />
          <Select value={status} onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="enriched">Enriched</SelectItem>
              <SelectItem value="deduped">Deduped</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Articles Table */}
        {error && <div className="text-red-600 py-4">Error: {error}</div>}

        {articles.length === 0 ? (
          <div className="text-center py-8 text-gray-600">No articles found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="text-left py-2">Title</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Published</th>
                  <th className="text-left py-2">Created</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div className="font-medium truncate max-w-xs">{article.title}</div>
                      <div className="text-xs text-gray-600 truncate max-w-xs">{article.url}</div>
                    </td>
                    <td className="py-3">
                      <Badge className={statusColor(article.status)}>
                        {article.status}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {article.blogger_post_id ? (
                        <Badge variant={article.blogger_draft ? 'outline' : 'default'}>
                          {article.blogger_draft ? 'Draft' : 'Published'}
                        </Badge>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-3 text-xs text-gray-600">
                      {new Date(article.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/article/${article.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} articles
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage(
                    Math.min(Math.ceil(total / limit), page + 1)
                  )
                }
                disabled={page >= Math.ceil(total / limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
