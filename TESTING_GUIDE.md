# AI News Automation System - Testing Guide

## Debug Endpoints

The system includes two debug endpoints to verify functionality:

### 1. Test Supabase Insert (`/api/debug/test-insert`)

**Purpose**: Test that articles and deduplication records can be inserted into Supabase

**Request**:
```bash
curl -X POST http://localhost:3000/api/debug/test-insert
```

**Expected Response**:
```json
{
  "success": true,
  "article": {
    "id": "uuid-here",
    "title": "Test Article - timestamp",
    "url": "https://test-article-timestamp.com",
    "content": "This is a test article...",
    "status": "pending",
    "created_at": "2026-06-02T15:00:00Z",
    ...
  },
  "dedupRecord": {
    "id": "uuid-here",
    "article_id": "uuid-here",
    "is_duplicate": false,
    ...
  },
  "message": "Both inserts succeeded"
}
```

**Troubleshooting**:
- If insert fails, check Supabase connection credentials
- Verify database tables exist: `articles` and `deduplication_records`
- Check RLS policies are not blocking inserts

### 2. Code Scanner (`/api/debug/scan-code`)

**Purpose**: Scan the codebase for any remaining Supabase v1 patterns (`.on()` handlers)

**Request**:
```bash
curl http://localhost:3000/api/debug/scan-code
```

**Expected Response**:
```json
{
  "success": true,
  "message": "No .on( patterns found - codebase is clean!",
  "findings": {}
}
```

**If Issues Found**:
```json
{
  "success": false,
  "message": "Found 2 files with .on( patterns",
  "findings": {
    "Services/blogger-api.ts": [
      {
        "line": 42,
        "code": ".insert(payload).on('error', ...)"
      }
    ]
  }
}
```

## Manual Testing Workflow

### Step 1: Add RSS Feeds

1. Visit http://localhost:3000
2. Click "Feeds" tab
3. Click "Add Feed" button
4. Enter feed URL (example: `https://news.ycombinator.com/rss`)
5. Enter feed name
6. Click "Save"

### Step 2: Manually Trigger Cron Jobs

```bash
# Fetch RSS feeds
curl -X POST http://localhost:3000/api/cron/fetch-feeds \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Deduplicate articles
curl -X POST http://localhost:3000/api/cron/deduplicate \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Enrich and publish
curl -X POST http://localhost:3000/api/cron/enrich-and-publish \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Step 3: Verify Data Flow

1. After fetch-feeds: Check `raw_articles` table count increases
2. After deduplicate: Check `articles` table gets populated, `deduplication_records` created
3. After enrich-and-publish: Check articles get SEO metadata, labels, and Blogger posts created

### Step 4: Dashboard Verification

1. **Overview Tab**: Check stats show articles, feeds, pending items
2. **Articles Tab**: View all articles, filter by status
3. **Feeds Tab**: List RSS feeds, test deletion
4. **Logs Tab**: View cron job execution history
5. **Settings Tab**: Configure API keys and thresholds

## Expected Database State

### After RSS Fetch
```
raw_articles: ~100+ rows
articles: 0 rows (not created yet)
deduplication_records: 0 rows
```

### After Deduplication
```
raw_articles: ~100 rows
articles: ~80-95 rows (after dedup removes ~5-20%)
deduplication_records: ~80-95 rows
```

### After Enrichment
```
articles: ~80-95 rows with:
  - meta_description filled
  - meta_keywords filled
  - ai_generated_labels filled
  - summary filled
  - status: "enriched"
```

### After Publishing
```
articles: ~80-95 rows with:
  - blogger_post_id filled
  - blogger_published_at filled
  - status: "published"
```

## Cron Job Configuration (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-feeds",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/cron/deduplicate",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/enrich-and-publish",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

## Environment Variables

Required for production:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
OPENROUTER_API_KEY=your_api_key
BLOGGER_API_KEY=your_api_key
BLOGGER_BLOG_ID=your_blog_id
BLOGGER_REFRESH_TOKEN=your_refresh_token
CRON_SECRET=random_secure_string
```

## Monitoring and Logs

### Real-time Logs
```bash
# Watch cron logs
curl http://localhost:3000/api/cron-logs?limit=20

# Watch article history for specific article
curl http://localhost:3000/api/articles/{id}
```

### Check Supabase Logs
Visit your Supabase project dashboard to monitor:
- Database query performance
- RLS policy violations
- Connection issues

## Common Issues and Solutions

### Issue: Articles not being created after fetch

**Check**:
1. Run `/api/debug/test-insert` to verify Supabase connection
2. Check raw_articles table is populated
3. Look at cron logs for error messages

**Solution**:
- Verify database credentials in `.env.local`
- Ensure tables exist: `raw_articles`, `articles`, `deduplication_records`
- Check RLS policies don't block inserts

### Issue: Cron jobs timing out

**Solution**:
- Reduce batch size (limit: 50 articles per job)
- Check OpenRouter API response times
- Ensure Blogger API isn't rate-limited

### Issue: Deduplication not working

**Check**:
1. Run `/api/debug/scan-code` for Supabase v1 code
2. Verify similarity_threshold in system_config (default: 0.75)
3. Check article_content isn't null (required for similarity check)

**Solution**:
- Adjust similarity_threshold lower for more aggressive dedup
- Ensure raw articles have content field populated

## Performance Benchmarks

Expected performance per cron run:

- **Fetch Feeds**: 2-5 seconds per feed (depends on feed size)
- **Deduplicate**: 1-3 seconds per 100 articles
- **Enrich & Publish**: 5-15 seconds per article (depends on OpenRouter latency)

Total cycle time: ~30-60 seconds for 100 articles

## Testing Checklist

- [ ] Supabase connection working (`/api/debug/test-insert` succeeds)
- [ ] Code is clean (`/api/debug/scan-code` returns no findings)
- [ ] RSS feeds can be added and deleted
- [ ] Fetch cron populates raw_articles
- [ ] Deduplicate cron processes articles and creates dedup records
- [ ] Enrich cron adds SEO metadata
- [ ] Articles are created in Blogger
- [ ] Dashboard shows correct stats
- [ ] Logs track all operations
- [ ] Articles can be edited and published manually
