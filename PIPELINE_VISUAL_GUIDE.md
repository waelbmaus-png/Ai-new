# Visual Pipeline Guide

## Current State (Before Fix)

```
RSS Feeds
   ↓
FETCH-FEEDS CRON
   ↓
raw_articles (created)
   ↓
DEDUPLICATE CRON
   ↓
articles table (status=deduped) ← 126 articles stuck here
   ↓
ENRICH-AND-PUBLISH CRON
   ↓
[BROKEN] Looking for status='enriched' (never exists!)
   ↗
   Status never changes to 'enriched'
   Status never changes to 'published'
   ✗ Blogger never receives posts
```

## Fixed Flow (After Changes)

```
┌─ RSS Feeds ──────────────────────────────────────────┐
│                                                      │
└─→ FETCH-FEEDS CRON (runs every 4 hours)          │
    │                                                 │
    ├─ [v0] Starting fetch cron                      │
    ├─ [v0] Fetching RSS feeds...                    │
    ├─ [v0] Found 50 new articles                    │
    └─→ INSERT raw_articles → ✓ Inserted 50        │
                                                      │
        ┌─ raw_articles table (50 new) ──────────────┐
        │                                            │
        └─→ DEDUPLICATE CRON (runs every 6 hours)  │
            │                                        │
            ├─ [v0] Starting deduplication          │
            ├─ [v0] Hash-based check: 40 unique    │
            ├─ [v0] Content similarity: 10 dups    │
            └─→ UPDATE articles SET status='deduped'
                    → ✓ Updated 40 articles        │
                                                    │
                ┌─ articles table (status=deduped) ──┐
                │ 40 new + 126 existing = 166 total  │
                │                                    │
                └─→ ENRICH-AND-PUBLISH CRON (every 8h)
                    │                                │
                    ├─ [v0] Fetching deduped articles
                    ├─ [v0] Found 40 articles
                    │                                │
                    └─→ FOR EACH ARTICLE:           │
                        │                            │
                        ├─ STEP 1: Article selected  │
                        ├─ STEP 2: AI enrichment...  │
                        ├─ STEP 3: Enriched ✓       │
                        ├─ STEP 4: Updating DB...   │
                        ├─ STEP 5: Status='enriched'│
                        ├─ STEP 6: Check config     │
                        ├─ STEP 7: Create Blogger   │
                        ├─ STEP 8: Post created ✓   │
                        └─ STEP 9: Status='published'
                                                    │
                        ┌─ Blogger Blog ──────────────┐
                        │ 40 new posts published      │
                        └────────────────────────────┘
                                                    │
                    ┌─ articles table ──────────────┐
                    │ published: 166                │
                    │ enriched: 0                   │
                    │ deduped: 0                    │
                    │ pending: 0                    │
                    └──────────────────────────────┘
```

## Status Lifecycle

### Article Status Transitions

```
PENDING
   ↓ (created by fetch-feeds)
DEDUPED
   ↓ (marked by deduplicate after checking duplicates)
ENRICHED ← ✓ FIXED: Now properly set during enrichment
   ↓ (enriched with AI metadata & blogger post created)
PUBLISHED
   ↓ (final state, article exists on Blogger)
[END]

FAILED (if error at any step)
   ↓ (stored with error_message for debugging)
[END]
```

## Data Flow by Status

### Status = 'pending'
```
Source: fetch-feeds cron
Count: 3 articles
Action: Initial state, not yet deduplicated
Next: Deduplicate cron processes these
```

### Status = 'deduped'
```
Source: deduplicate cron
Count: 126 articles (BEFORE: all stuck here)
Criteria: 
  - Passed duplicate checks (hash + content similarity)
  - No blogger_post_id yet
  - Ready for AI enrichment
Next: Enrich-and-publish cron processes these
```

### Status = 'enriched'
```
Source: enrich-and-publish cron (STEP 5)
Count: Increases as articles are enriched
Criteria:
  - AI enrichment completed
  - meta_description set
  - ai_generated_labels set
  - Ready for Blogger publishing
Next: Blogger post creation (STEP 7-8)
```

### Status = 'published'
```
Source: enrich-and-publish cron (STEP 9)
Count: Increases as posts are created
Criteria:
  - blogger_post_id set (post ID from Blogger)
  - blogger_published_at set (timestamp)
  - Article successfully published on Blogger
Final State: Article visible on blog
```

### Status = 'failed'
```
Source: Any cron job on error
Count: Increases on failures
Stores: error_message with root cause
Action: Manual review and fix required
Manual Fix: Update status back to 'deduped' or 'enriched' after fixing issue
```

## Timeline Example: Single Article

```
TIME    CRON JOB              STEP              STATUS       DB UPDATE
────────────────────────────────────────────────────────────────────
08:00   fetch-feeds           Read RSS          pending      INSERT raw_articles
        ↓
        deduplicate           Check duplicates  deduped      UPDATE status='deduped'
12:00   ↓
        enrich-and-publish    STEP 1-5          enriched     UPDATE status='enriched'
16:00                         ├─ AI enrichment
                              ├─ Meta desc set
                              ├─ Labels generated
                              │
                              STEP 6-9          published    UPDATE status='published'
                              ├─ Blogger post ID
                              ├─ Post created
                              └─ Visible on blog ✓
```

## Console Logs for Article Tracking

### Following One Article Through Pipeline

```
[Article ID: abc-123-def]

[08:00 fetch-feeds]
  [v0] Found 1 article from feed
  [v0] Created raw_article abc-123-def

[10:00 deduplicate]
  [v0] Deduplicating raw_article abc-123-def
  [v0] No duplicates found
  [v0] Creating article from raw_article
  [v0] Article created: ID=abc-123-def, Status=deduped

[16:00 enrich-and-publish]
  [v0] STEP 1: Selected article for enrichment - ID=abc-123-def
  [v0] STEP 2: Calling AI enrichment for article abc-123-def...
  [v0] STEP 3: AI enrichment completed - MetaDesc length: 156, Labels: 5
  [v0] STEP 4: Updating article abc-123-def with enrichment data and status='enriched'
  [v0] STEP 5: Article abc-123-def successfully updated with enrichment
  [v0] STEP 6: Checking auto-publish configuration...
  [v0] STEP 6b: auto_publish_drafts = true
  [v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post
  [v0] createBloggerPost: Starting post creation
  [v0] Blogger credentials check - BlogId: ✓, Token: ✓
  [v0] createBloggerPost: Sending POST request to Blogger API
  [v0] createBloggerPost: Response status: 200
  [v0] createBloggerPost: SUCCESS. PostId: 9876543210, URL: https://...
  [v0] STEP 8: Blogger post created successfully. PostId: 9876543210
  [v0] STEP 9: Article abc-123-def status updated to published
```

## Debug Endpoints Flow

### Pipeline Status Check
```
GET /api/debug/pipeline-status
         ↓
    [Check database]
         ↓
    ┌─────────────────────────┐
    │ Count by status         │
    ├─────────────────────────┤
    │ pending:     3          │
    │ deduped:   126          │
    │ enriched:    0          │
    │ published:   0          │
    │ failed:      0          │
    └─────────────────────────┘
         ↓
    [Show articles needing enrichment]
    [Show articles needing publication]
    [Show failed articles with errors]
    [Show recent cron logs]
```

### Blogger Test Flow
```
GET /api/debug/blogger-test
         ↓
    [Fetch config]
         ├─ blogger_blog_id: ✓
         ├─ blogger_api_key: ✓
         └─ Valid credentials
         ↓
    [Create test post]
         ├─ Title: "Test Article 2024-..."
         ├─ Content: "This is a test article"
         ├─ Labels: ['test', 'debug']
         └─ Draft: true
         ↓
    [Blogger API Response]
         ├─ Status: 201 Created
         ├─ PostId: 123456789
         ├─ URL: https://blog.blogger.com/...
         └─ Success: true ✓
         ↓
    [Log in article_history]
         └─ action: 'blogger_test'
             status: 'success'
```

### Manual Trigger Flow
```
POST /api/debug/trigger-cron
     {"job": "enrich-and-publish"}
         ↓
    [Call /api/cron/enrich-and-publish]
         ├─ Authorization: Bearer CRON_SECRET
         └─ Method: POST
         ↓
    [Enrich-and-publish cron executes]
         ├─ Fetch articles (status=deduped)
         ├─ For each article:
         │   ├─ STEP 1-5: Enrich
         │   └─ STEP 6-9: Publish
         └─ Return results
         ↓
    [Response]
         ├─ success: true
         ├─ enrichedProcessedCount: 126
         ├─ publishedCount: 126
         └─ errors: []
```

## Quick Troubleshooting Map

```
Is enrichment running?
  NO → Check auto_publish_drafts setting
       Try: /api/debug/trigger-cron → enrich-and-publish
       
Is Blogger API working?
  NO → Run: /api/debug/blogger-test
       Check: blogger_api_key in Settings
       Verify: OAuth token not expired
       
Are articles stuck?
  YES → Check: /api/debug/pipeline-status
        Look at: articles needing enrichment
        Check: Step logs for failure point
        
Is status not updating?
  YES → Check: error_message in article
        Verify: Database connection
        Check: Article history for failures
        
No posts on Blogger?
  YES → Verify: auto_publish_drafts = true
        Check: Blogger credentials valid
        Run: /api/debug/blogger-test
        Look: For Blogger errors in logs
```

## Healthy State Indicators

```
✓ Pipeline Status Shows:
  • pending: 0-10 (small queue)
  • deduped: 0-100 (waiting to be enriched)
  • enriched: 0-20 (intermediate)
  • published: growing number
  • failed: 0-5 (few failures)

✓ Cron Logs Show:
  • Recent successful executions
  • articlesProcessed > 0
  • articlesPublished > 0
  • No recent error_message entries

✓ Blogger Test Shows:
  • success: true
  • PostId returned
  • URL starting with https://blog.blogger.com/

✓ Dashboard Shows:
  • Increasing article counts
  • Recent posts visible
  • Logs showing successful runs

✓ Blogger Blog Shows:
  • New posts appearing
  • Correct titles and content
  • Published or draft status correct
```

## Recovery from Failure

```
If articles are stuck in 'failed' state:
  
  1. Find the root cause:
     [v0] STEP X: [error message]
     
  2. Fix the issue (see PUBLICATION_DEBUG_GUIDE.md)
  
  3. Reset article status:
     UPDATE articles SET status='deduped', meta_description=NULL
     WHERE id='article-id'
     
  4. Retry:
     POST /api/debug/trigger-cron → enrich-and-publish
     
  5. Monitor:
     GET /api/debug/pipeline-status
     Check: Article should be processing again
```

## Monitoring Checklist

Daily:
  [ ] Run /api/debug/pipeline-status
  [ ] Check for articles in 'failed' status
  [ ] Verify Blogger posts appearing
  
Weekly:
  [ ] Run /api/debug/blogger-test
  [ ] Review cron_logs for errors
  [ ] Check article_history for failures
  
On Issues:
  [ ] Run /api/debug/trigger-cron to retry
  [ ] Check console logs for STEP failures
  [ ] Verify credentials in Settings
  [ ] Review PUBLICATION_DEBUG_GUIDE.md
