# Code Changes Summary - Publication Pipeline Debugging

## Overview
Enhanced the publication pipeline with comprehensive logging, error tracking, and debug endpoints to trace why articles aren't being published to Blogger.

## Files Modified

### 1. `lib/services/blogger-api.ts`
**Changes:**
- Added detailed logging in `getAccessToken()` showing token length
- Completely rewrote `createBloggerPost()` with step-by-step logging:
  - STEP 1: Log input parameters (title, isDraft)
  - STEP 2: Log credential check results
  - STEP 3: Log API request details
  - STEP 4: Log response status code
  - STEP 5: Log full Blogger API response or error
- Returns error details in response object for better tracking
- All errors now include full Blogger API response for debugging

**Key Addition:**
```typescript
// Enhanced response type includes error field
return { postId: string; url: string; error?: string }
```

### 2. `app/api/cron/enrich-and-publish/route.ts`
**Changes:**
- Fixed critical bug: Changed status query from `'enriched'` to `'deduped'`
  - Articles were stuck because they were looking for the wrong status
- Added 9-step pipeline logging (STEP 1-9):
  - STEP 1: Article selected
  - STEP 2: AI enrichment started
  - STEP 3: AI enrichment completed
  - STEP 4: Starting database update with status='enriched'
  - STEP 5: Database update confirmed
  - STEP 6: Checking auto-publish config
  - STEP 7: Starting Blogger post creation
  - STEP 8: Blogger post created or failed
  - STEP 9: Article status updated to 'published'
- Added explicit `status: 'enriched'` update during enrichment phase
- Enhanced error logging with error details in cron_logs
- Log full error context when Blogger API fails
- Improved error handling with proper error storage

**Critical Fix:**
```typescript
// BEFORE: Looking for status='enriched' (which never gets set!)
.eq("status", "enriched")

// AFTER: Look for deduped articles needing enrichment
.eq("status", "deduped")
```

### 3. `app/api/debug/blogger-test/route.ts` (NEW)
**Purpose**: Test Blogger API connectivity and credentials

**Functionality:**
- GET endpoint to test Blogger publishing
- Checks if blogger_blog_id and blogger_api_key are set
- Creates a test draft post on Blogger
- Returns full response including PostId and URL
- Logs test article creation in article_history
- Provides detailed error messages if test fails

**Usage:**
```bash
curl https://your-app.com/api/debug/blogger-test
```

**Response:**
```json
{
  "success": true,
  "credentials": {
    "blogger_blog_id": "1234567890",
    "blogger_api_key_length": 256
  },
  "result": {
    "postId": "123456",
    "url": "https://..."
  }
}
```

### 4. `app/api/debug/pipeline-status/route.ts` (NEW)
**Purpose**: Monitor article pipeline status

**Functionality:**
- GET endpoint showing all article statuses
- Shows count of articles by status (pending, deduped, enriched, published, failed)
- Lists articles needing enrichment (status=deduped, no meta_description)
- Lists articles needing publication (status=enriched, no blogger_post_id)
- Lists failed articles with error messages
- Shows recent cron job execution history
- All data shown with exact counts and sample articles

**Usage:**
```bash
curl https://your-app.com/api/debug/pipeline-status
```

**Response:**
```json
{
  "summary": {
    "total": 129,
    "byStatus": {
      "pending": 3,
      "deduped": 126,
      "enriched": 3,
      "published": 0,
      "failed": 0
    }
  },
  "pipeline": {
    "needsEnrichment": 126,
    "needsPublication": 3,
    "failed": 0
  },
  "details": {
    "articlesNeedingEnrichment": [...],
    "articlesNeedingPublication": [...],
    "failedArticles": [...]
  }
}
```

### 5. `app/api/debug/trigger-cron/route.ts` (NEW)
**Purpose**: Manually trigger cron jobs for testing

**Functionality:**
- POST endpoint to manually execute any cron job
- Supports: fetch-feeds, deduplicate, enrich-and-publish
- Uses CRON_SECRET for security
- Returns job execution result
- Useful for testing without waiting for scheduled runs

**Usage:**
```bash
curl -X POST https://your-app.com/api/debug/trigger-cron \
  -H "Content-Type: application/json" \
  -d '{"job": "enrich-and-publish"}'
```

## Logging Flow

### During Enrichment (enrich-and-publish)

```
[v0] Starting enrichment and publish cron job
[v0] Total articles in database: 129
[v0] Articles with status="deduped": 126
[v0] Found 126 articles for enrichment

[v0] STEP 1: Selected article for enrichment - ID=abc123, Title="..."
[v0] STEP 2: Calling AI enrichment for article abc123...
[v0] STEP 3: AI enrichment completed - MetaDesc length: 156, Labels: 5
[v0] STEP 4: Updating article abc123 with enrichment data and status='enriched'...
[v0] STEP 5: Article abc123 successfully updated with enrichment data and status=enriched
[v0] STEP 6: Checking auto-publish configuration...
[v0] STEP 6b: auto_publish_drafts = true
[v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post for "Article Title"
[v0] createBloggerPost: Starting post creation. Title: "Article Title", isDraft: false
[v0] Blogger credentials check - BlogId: ✓, Token: ✓
[v0] createBloggerPost: Sending POST request to Blogger API
[v0] createBloggerPost: Response status: 200
[v0] createBloggerPost: SUCCESS. PostId: 123456789, URL: https://...
[v0] STEP 8: Blogger post created successfully. PostId: 123456789
[v0] STEP 9: Article abc123 status updated to published. PostId: 123456789
[v0] Enrichment completed. Enriched: 126, Published: 126
```

### On Error

```
[v0] STEP 1: Selected article for enrichment - ID=abc123, Title="..."
[v0] STEP 2: Calling AI enrichment...
[v0] ERROR processing article abc123: AI enrichment failed
[v0] ERROR updating article status to 'failed': [reason]
[v0] ERROR: Article abc123: AI enrichment failed
```

## Database Changes

### article_history logging
- Now logs full error context in `details` field
- Enrichment logs include: metaDescription length, label counts
- Publication logs include: Blogger postId, URL
- Failed logs include: full error message and context

### articles table tracking
- `status` column now properly cycles: deduped → enriched → published
- `error_message` stores full error details for failed articles
- `meta_description` filled during enrichment step
- `blogger_post_id` filled during publication step

## Configuration Required

Ensure these are set in `system_config`:
1. `blogger_blog_id` - Your Blogger blog ID (required)
2. `blogger_api_key` - OAuth2 access token (required)
3. `auto_publish_drafts` - true/false (required)
4. `openrouter_api_key` - For AI enrichment (required)

## Testing & Verification

### Test 1: Pipeline Status
```bash
curl https://your-app.com/api/debug/pipeline-status
# Should show: ~126 articles with status='deduped' needing enrichment
```

### Test 2: Blogger API
```bash
curl https://your-app.com/api/debug/blogger-test
# Should show: successful post creation with PostId and URL
```

### Test 3: Manual Trigger
```bash
curl -X POST https://your-app.com/api/debug/trigger-cron \
  -H "Content-Type: application/json" \
  -d '{"job": "enrich-and-publish"}'
# Monitor console for STEP 1-9 progression
```

## Expected Outcome After Fixes

1. **Immediate**: Console logs show 9-step progression for each article
2. **Within minutes**: Articles status changes: deduped → enriched → published
3. **On Blogger**: New posts appear (published) or drafts (if auto_publish=false)
4. **In dashboard**:
   - Published articles count increases
   - Cron logs show successful execution
   - Article history shows enrichment + publication steps

## Monitoring Going Forward

Use these endpoints regularly:
- `/api/debug/pipeline-status` - Overall health check
- `/api/debug/blogger-test` - Verify API connectivity
- Dashboard **Logs** tab - View cron execution history
- Database `cron_logs` table - Historical execution data
