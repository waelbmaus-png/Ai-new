# API Documentation - AI News Automation System

## Overview

All endpoints are REST-based and return JSON. Most endpoints require proper authorization.

## Base URL

```
https://your-domain.com/api
```

## Authentication

Cron endpoints require Bearer token in Authorization header:
```
Authorization: Bearer YOUR_CRON_SECRET
```

## Response Format

All responses follow this pattern:
```json
{
  "data": {...},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Endpoints

### Articles

#### List Articles
```
GET /articles
```

**Query Parameters:**
- `page` (number): Page number, default 1
- `limit` (number): Items per page, default 20
- `status` (string): Filter by status (pending, enriched, published, deduped, failed)
- `search` (string): Search in title and content

**Response:**
```json
{
  "articles": [
    {
      "id": "uuid",
      "title": "Article Title",
      "url": "https://example.com/article",
      "status": "published",
      "blogger_post_id": "blogger-id",
      "blogger_draft": false,
      "created_at": "2024-01-01T00:00:00Z",
      "meta_description": "SEO description..."
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

#### Get Article
```
GET /articles/[id]
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Article Title",
  "url": "https://example.com/article",
  "content": "Full article content...",
  "summary": "Brief summary",
  "meta_description": "SEO description",
  "meta_keywords": ["keyword1", "keyword2"],
  "ai_generated_labels": ["Tech", "AI"],
  "labels": ["custom", "labels"],
  "status": "published",
  "blogger_post_id": "blogger-id",
  "blogger_draft": false,
  "created_at": "2024-01-01T00:00:00Z",
  "article_history": [
    {
      "id": "uuid",
      "action": "published",
      "status": "success",
      "created_at": "2024-01-01T00:00:00Z",
      "error": null
    }
  ]
}
```

#### Create Article
```
POST /articles
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Article Title",
  "url": "https://example.com/article",
  "content": "Article content...",
  "metaDescription": "SEO description",
  "metaKeywords": ["keyword1", "keyword2"],
  "labels": ["label1", "label2"]
}
```

**Response:** Returns created article object

#### Update Article
```
PUT /articles/[id]
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "metaDescription": "Updated description",
  "labels": ["updated", "labels"],
  "publish": false
}
```

**Parameters:**
- `publish` (boolean): If true, publishes draft to Blogger

**Response:** Returns updated article object

#### Delete Article
```
DELETE /articles/[id]
```

**Response:**
```json
{
  "success": true
}
```

---

### RSS Feeds

#### List Feeds
```
GET /feeds
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "TechCrunch",
    "url": "https://techcrunch.com/feed/",
    "category": "Technology",
    "active": true,
    "refresh_interval_hours": 4,
    "last_fetched_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Create Feed
```
POST /feeds
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Feed Name",
  "url": "https://example.com/feed.xml",
  "category": "Technology",
  "refreshIntervalHours": 4
}
```

**Response:** Returns created feed object

---

### Cron Jobs

#### Fetch RSS Feeds
```
POST /cron/fetch-feeds
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "feedsProcessed": 5,
  "articlesFound": 42,
  "errors": ["Error 1", "Error 2"]
}
```

**What it does:**
- Fetches new articles from all active RSS feeds
- Stores articles in raw_articles table
- Updates last_fetched_at for each feed
- Logs execution

#### Deduplicate Articles
```
POST /cron/deduplicate
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "processedCount": 100,
  "duplicatesFound": 15,
  "uniqueArticles": 85,
  "errors": []
}
```

**What it does:**
- Checks raw articles for duplicates
- Uses hash-based and content similarity
- Creates articles table entries
- Records deduplication results
- Updates article status

#### Enrich and Publish
```
POST /cron/enrich-and-publish
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "enrichedCount": 50,
  "publishedCount": 50,
  "errors": []
}
```

**What it does:**
- Calls OpenRouter AI for content enrichment
- Generates SEO metadata and labels
- Creates Blogger posts (draft or published)
- Updates article status
- Records publishing results

---

### Cron Logs

#### Get Logs
```
GET /cron-logs
```

**Query Parameters:**
- `jobName` (string): Filter by job name
- `page` (number): Page number, default 1
- `limit` (number): Items per page, default 20

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "job_name": "fetch-feeds",
      "status": "success",
      "started_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:05:00Z",
      "articles_processed": 100,
      "articles_published": 50,
      "error_message": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

---

### Dashboard

#### Get Statistics
```
GET /dashboard/stats
```

**Response:**
```json
{
  "stats": {
    "totalArticles": 500,
    "publishedArticles": 450,
    "draftArticles": 30,
    "pendingArticles": 20,
    "totalFeeds": 5
  },
  "statusCounts": {
    "pending": 10,
    "enriched": 5,
    "published": 450,
    "deduped": 30,
    "failed": 5
  },
  "recentCrons": [
    {
      "id": "uuid",
      "job_name": "fetch-feeds",
      "status": "success",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Status Values

| Status | Description |
|--------|-------------|
| pending | Newly fetched, awaiting processing |
| enriched | Ready for publishing |
| deduped | Identified as duplicate |
| published | Published to Blogger |
| failed | Error during processing |

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid request parameters",
  "details": "..."
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "details": "Invalid or missing authorization header"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "details": "Article with ID xyz not found"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "details": "..."
}
```

---

## Rate Limiting

- No built-in rate limiting on dashboard APIs
- Vercel Cron endpoints: Run on configured schedule
- OpenRouter API: Subject to OpenRouter's rate limits
- Supabase: Subject to Supabase plan limits

---

## Data Types

### Article
```typescript
{
  id: string (UUID)
  title: string (required)
  url: string (required, unique)
  content: string (optional)
  summary: string (optional)
  author: string (optional)
  original_published_at: timestamp (optional)
  meta_description: string (optional, max 160 chars)
  meta_keywords: string[] (optional)
  labels: string[] (optional)
  ai_generated_labels: string[] (optional)
  blogger_post_id: string (optional)
  blogger_draft: boolean (default: true)
  blogger_published_at: timestamp (optional)
  status: string (pending, enriched, published, deduped, failed)
  error_message: string (optional)
  created_at: timestamp
  updated_at: timestamp
}
```

### Feed
```typescript
{
  id: string (UUID)
  name: string (required)
  url: string (required, unique)
  category: string (optional)
  active: boolean (default: true)
  refresh_interval_hours: number (default: 4)
  last_fetched_at: timestamp (optional)
  created_at: timestamp
  updated_at: timestamp
}
```

### HistoryEntry
```typescript
{
  id: string (UUID)
  article_id: string (UUID, required)
  action: string (fetched, deduped, enriched, published, failed)
  status: string (optional)
  details: object (optional)
  error: string (optional)
  created_at: timestamp
}
```

---

## Examples

### Fetch and search articles
```bash
curl "https://your-domain.com/api/articles?status=published&search=AI&page=1&limit=10"
```

### Create new article
```bash
curl -X POST https://your-domain.com/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Article",
    "url": "https://example.com/article",
    "content": "Article content...",
    "labels": ["tech", "news"]
  }'
```

### Run fetch cron manually
```bash
curl -X POST https://your-domain.com/api/cron/fetch-feeds \
  -H "Authorization: Bearer your-secret"
```

### Get dashboard stats
```bash
curl https://your-domain.com/api/dashboard/stats
```

---

## Performance Notes

- Article listing is paginated (default 20 per page)
- History logs paginated (default 50 per page)
- Cron logs paginated (default 20 per page)
- Search queries indexed on title and content
- Status queries use indexed columns
- Article history loaded inline with article details

---

## Future API Endpoints (Planned)

- `POST /auth/login` - User authentication
- `POST /articles/[id]/publish` - Publish specific article
- `POST /articles/[id]/republish` - Update Blogger post
- `GET /feeds/[id]/test` - Test RSS feed validity
- `POST /feeds/[id]/fetch` - Fetch specific feed
- `GET /analytics/summary` - Aggregated statistics
- `POST /config/update` - Update system configuration
