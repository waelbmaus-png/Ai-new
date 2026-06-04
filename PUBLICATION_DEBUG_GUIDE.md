# Publication Pipeline Debugging Guide

## Current Status

- **Processed Articles**: 129
- **Published Articles**: 0
- **Pending**: 3
- **Enriched**: 3
- **Deduped**: 126

**Issue**: Articles are being deduped but not moving through enrichment → publication pipeline.

## Root Cause Analysis

The pipeline expects articles with `status='enriched'` and `meta_description=null`, but articles are stuck at `status='deduped'`.

### Pipeline Flow

```
fetched (raw_articles)
    ↓
deduped (articles.status='deduped')
    ↓
enriched (articles.status='enriched', meta_description set)
    ↓
published (articles.status='published', blogger_post_id set)
```

## Debug Endpoints

### 1. Pipeline Status Check
```bash
curl https://your-app.com/api/debug/pipeline-status
```

**Response Shows:**
- Count of articles by status
- Articles needing enrichment (status=deduped, no meta_description)
- Articles needing publication (status=enriched, no blogger_post_id)
- Failed articles with error messages
- Recent cron job execution history

### 2. Blogger API Test
```bash
curl https://your-app.com/api/debug/blogger-test
```

**Tests:**
- ✓ Blogger credentials exist (blogger_blog_id, blogger_api_key)
- ✓ Creates a test draft post
- ✓ Returns full Blogger API response

**Expected Response:**
```json
{
  "success": true,
  "message": "Blogger API test successful",
  "result": {
    "postId": "1234567890",
    "url": "https://blog.blogger.com/2024/12/test-article.html"
  }
}
```

**If Failed:**
- Check `details` field for exact Blogger API error
- Verify `blogger_api_key` is valid OAuth2 token
- Verify `blogger_blog_id` is correct

### 3. Manual Trigger Cron Job
```bash
curl -X POST https://your-app.com/api/debug/trigger-cron \
  -H "Content-Type: application/json" \
  -d '{"job": "enrich-and-publish"}'
```

**Available Jobs:**
- `fetch-feeds` - Fetch new articles from RSS feeds
- `deduplicate` - Deduplicate articles
- `enrich-and-publish` - Enrich with AI and publish to Blogger

## Step-by-Step Debugging

### Step 1: Check Article Status Distribution
```bash
curl https://your-app.com/api/debug/pipeline-status
```

Look for articles in each status bucket.

### Step 2: Verify Blogger Credentials
In `/admin` or database:
1. Open **Settings** tab
2. Check that these are filled:
   - `blogger_blog_id` - Your Blogger blog ID
   - `blogger_api_key` - OAuth2 access token
   - `auto_publish_drafts` - true/false

**To Get Credentials:**
1. Go to https://myaccount.google.com
2. Select "Blogger Blog ID" (format: 1234567890)
3. Get OAuth2 token from Google Cloud Console

### Step 3: Test Blogger Connection
```bash
curl https://your-app.com/api/debug/blogger-test
```

Expected output shows successful post creation with ID and URL.

If fails:
- **401 Unauthorized**: OAuth token expired or invalid
- **403 Forbidden**: Token doesn't have Blogger API permission
- **404 Not Found**: Blog ID is incorrect
- **400 Bad Request**: Check response `details` for API error

### Step 4: Check Enrichment Pipeline
Look at pipeline-status output for:
- **Articles needing enrichment**: Should show articles with `status='deduped'`
- If > 0: Run `enrich-and-publish` cron

### Step 5: View Cron Execution Logs
From the dashboard, go to **Logs** tab:
- Check recent executions of `enrich-and-publish`
- Look for errors in execution
- Check articles_processed and articles_published counts

### Step 6: Check Article History
In database (`article_history` table):
```sql
SELECT article_id, action, status, error, created_at 
FROM article_history 
ORDER BY created_at DESC
LIMIT 20;
```

Look for:
- `action='enriched'` with `status='success'`
- `action='published'` with `status='success'` or error details

## Console Logs Reference

When enrich-and-publish runs, look for these console logs:

### Success Path
```
[v0] STEP 1: Selected article for enrichment - ID=..., Title="..."
[v0] STEP 2: Calling AI enrichment for article ...
[v0] STEP 3: AI enrichment completed - MetaDesc length: 156, Labels: 3
[v0] STEP 4: Updating article ... with status='enriched'
[v0] STEP 5: Article ... successfully updated with enrichment
[v0] STEP 6: Checking auto-publish configuration...
[v0] STEP 6b: auto_publish_drafts = true
[v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post
[v0] STEP 8: Blogger post created successfully. PostId: 123456
[v0] STEP 9: Article ... status updated to published
```

### Error Path
```
[v0] ERROR processing article ...: [error message]
[v0] Article ... status updated to published = failed
```

## Common Issues & Fixes

### Issue 1: No Articles in "deduped" Status
**Cause**: Deduplication cron hasn't run successfully

**Fix**:
1. Check fetch-feeds cron logs
2. Verify RSS feeds are added in Settings → Feeds
3. Manually trigger: `curl -X POST /api/debug/trigger-cron -d '{"job":"fetch-feeds"}'`

### Issue 2: Articles Stuck in "deduped"
**Cause**: Enrichment isn't running

**Fix**:
1. Check `auto_publish_drafts` setting - should be `true` or `false`
2. Manually trigger: `curl -X POST /api/debug/trigger-cron -d '{"job":"enrich-and-publish"}'`
3. Check console logs for "STEP 1" to "STEP 9" sequence

### Issue 3: Blogger API Fails (401/403)
**Cause**: Invalid or expired OAuth token

**Fix**:
1. Go to https://console.cloud.google.com
2. Generate new OAuth2 token
3. Update `blogger_api_key` in Settings
4. Test with `/api/debug/blogger-test`

### Issue 4: Articles Published but Status Not Updated
**Cause**: Database update failed after Blogger post creation

**Fix**:
1. Check `article_history` for articles with `action='published'` and error
2. Manually update article status: Update `articles` table set `status='published'` where `blogger_post_id IS NOT NULL`

## Database Queries for Debugging

### View articles by status:
```sql
SELECT status, COUNT(*) as count 
FROM articles 
GROUP BY status;
```

### View articles needing enrichment:
```sql
SELECT id, title, status, meta_description 
FROM articles 
WHERE status='deduped' AND meta_description IS NULL 
LIMIT 10;
```

### View articles needing publication:
```sql
SELECT id, title, status, blogger_post_id, blogger_draft 
FROM articles 
WHERE status='enriched' AND blogger_post_id IS NULL 
LIMIT 10;
```

### View failed articles:
```sql
SELECT id, title, status, error_message, updated_at 
FROM articles 
WHERE status='failed' 
ORDER BY updated_at DESC 
LIMIT 10;
```

### View recent cron logs:
```sql
SELECT job_name, status, articles_processed, articles_published, 
       error_message, created_at 
FROM cron_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### View article history for specific article:
```sql
SELECT action, status, error, details, created_at 
FROM article_history 
WHERE article_id = '...' 
ORDER BY created_at DESC;
```

## Key Credentials to Verify

1. **blogger_blog_id** - Format: `1234567890` (your Blogger blog ID)
   - Get from: https://www.blogger.com/blog/posts/YOUR_BLOG_ID
   
2. **blogger_api_key** - OAuth2 access token
   - Get from: Google Cloud Console > Credentials > OAuth 2.0 Client
   - Must have Blogger API scope enabled
   
3. **openrouter_api_key** - For AI enrichment
   - Get from: https://openrouter.ai/keys
   
4. **auto_publish_drafts** - Boolean
   - `true`: Publish directly to Blogger (visible)
   - `false`: Create as draft (manual review needed)

## Testing Checklist

- [ ] Pipeline status shows articles in each stage
- [ ] Blogger test endpoint returns successful post creation
- [ ] Credentials page shows all 4 keys configured
- [ ] Recent cron logs show successful executions
- [ ] Article history shows enrichment steps
- [ ] New articles appear on Blogger blog
- [ ] Drafts appear in Blogger if auto_publish=false

## Still Stuck?

Check console output during cron execution:
1. Look for the exact step where it fails (STEP 1-9)
2. Look for error message after "ERROR:" or "ERROR processing"
3. Check `blogger-test` endpoint for API connectivity issues
4. Verify all credentials are present and valid
