# Publication Pipeline Verification Checklist

## Pre-Test Verification

### ✓ Code Changes Applied
- [x] Modified `/lib/services/blogger-api.ts` with detailed logging
- [x] Modified `/app/api/cron/enrich-and-publish/route.ts` with 9-step tracing
- [x] Created `/app/api/debug/blogger-test/route.ts`
- [x] Created `/app/api/debug/pipeline-status/route.ts`
- [x] Created `/app/api/debug/trigger-cron/route.ts`
- [x] Build successful with no errors

### ✓ Database Schema Ready
- [x] `articles` table has `status` column (pending, deduped, enriched, published, failed)
- [x] `articles` table has `meta_description` column
- [x] `articles` table has `blogger_post_id` column
- [x] `system_config` table has required configuration keys

---

## Step 1: Verify Configuration

### Check Blogger Credentials
Navigate to dashboard **Settings** tab and verify:

```
□ blogger_blog_id
  Expected: 10-digit number (e.g., 1234567890)
  Status: ___________

□ blogger_api_key
  Expected: Long OAuth2 token
  Status: ___________

□ auto_publish_drafts
  Expected: true or false
  Status: ___________

□ openrouter_api_key
  Expected: API key for AI enrichment
  Status: ___________
```

**Action if Missing:**
1. Go to https://www.blogger.com to get blog ID
2. Go to https://console.cloud.google.com to generate OAuth2 token
3. Go to https://openrouter.ai/keys for OpenRouter key

---

## Step 2: Test Blogger API Connectivity

### Run Blogger Test Endpoint
```bash
curl https://your-app.com/api/debug/blogger-test
```

### Expected Response:
```json
{
  "success": true,
  "message": "Blogger API test successful",
  "credentials": {
    "blogger_blog_id": "1234567890",
    "blogger_api_key_length": 256
  },
  "result": {
    "postId": "123456789",
    "url": "https://blog.blogger.com/..."
  }
}
```

### Verification Checklist:
- [ ] Response status is 200
- [ ] `success: true`
- [ ] `postId` is returned (not empty)
- [ ] `url` starts with `https://blog.blogger.com/`
- [ ] Test post appears in Blogger blog (check as draft)

**If Test Fails:**
| Error | Cause | Fix |
|-------|-------|-----|
| 401 Unauthorized | Invalid OAuth token | Regenerate from Google Cloud Console |
| 403 Forbidden | Token lacks permissions | Enable Blogger API in Google Cloud |
| 404 Not Found | Wrong blog ID | Verify blog ID format (10 digits) |
| `Missing Blogger credentials` | Empty config | Fill settings in dashboard |

---

## Step 3: Check Pipeline Status

### Run Pipeline Status Endpoint
```bash
curl https://your-app.com/api/debug/pipeline-status
```

### Expected Response:
```json
{
  "success": true,
  "summary": {
    "total": 129,
    "byStatus": {
      "pending": 3,
      "deduped": 126,
      "enriched": 0,
      "published": 0,
      "failed": 0
    }
  },
  "pipeline": {
    "needsEnrichment": 126,
    "needsPublication": 0,
    "failed": 0
  }
}
```

### Verification Checklist:
- [ ] Response status is 200
- [ ] Total count matches expected article count
- [ ] `needsEnrichment` shows count of deduped articles
- [ ] If any `needsPublication`, check Blogger API test first

**Current Expected State:**
- Status 'deduped': ~126 articles (waiting for enrichment)
- Status 'enriched': ~0 articles
- Status 'published': ~0 articles

---

## Step 4: Trigger Enrichment Job

### Manually Trigger Enrich-and-Publish
```bash
curl -X POST https://your-app.com/api/debug/trigger-cron \
  -H "Content-Type: application/json" \
  -d '{"job": "enrich-and-publish"}'
```

### Monitor During Execution:
1. Open browser console (F12)
2. Watch for these log messages:

**Expected Log Sequence:**
```
[v0] STEP 1: Selected article for enrichment
[v0] STEP 2: Calling AI enrichment for article
[v0] STEP 3: AI enrichment completed
[v0] STEP 4: Updating article with enrichment data and status='enriched'
[v0] STEP 5: Article successfully updated with enrichment
[v0] STEP 6: Checking auto-publish configuration
[v0] STEP 6b: auto_publish_drafts = true
[v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post
[v0] STEP 8: Blogger post created successfully. PostId: ...
[v0] STEP 9: Article status updated to published. PostId: ...
```

### Expected Response:
```json
{
  "success": true,
  "enrichedProcessedCount": 126,
  "publishedCount": 126
}
```

### Verification Checklist:
- [ ] No errors in console (check for ERROR or ✕)
- [ ] Logs show STEP 1 through STEP 9
- [ ] `enrichedProcessedCount` > 0
- [ ] `publishedCount` > 0
- [ ] New posts appear on Blogger blog

**If Fails at Specific Step:**

| Step | Error | Likely Cause |
|------|-------|--------------|
| 1-3 | AI error | OpenRouter API key invalid or rate limited |
| 4-5 | Database error | Supabase connection issue |
| 6-7 | Cannot publish | `auto_publish_drafts` is false |
| 8 | Blogger API error | Invalid token or credentials |
| 9 | Update error | Article status field locked |

---

## Step 5: Verify Articles in Dashboard

### Check Dashboard Tabs:

**Overview Tab:**
- [ ] "Enriched" metric increases
- [ ] "Published" metric increases

**Articles Tab:**
- [ ] Filter by Status = "published"
- [ ] Should show recently published articles
- [ ] Each article has `blogger_post_id` value

**Logs Tab:**
- [ ] Recent cron execution shows "success"
- [ ] `articlesProcessed` and `articlesPublished` match

---

## Step 6: Verify Blogger Blog

### Check Blogger Blog:
1. Go to https://www.blogger.com/blog/posts/YOUR_BLOG_ID
2. Look for:
   - [ ] New posts from today
   - [ ] Post titles match article titles
   - [ ] Posts are published (not drafts) if `auto_publish_drafts=true`
   - [ ] Posts are drafts if `auto_publish_drafts=false`

### Check Post Details:
- [ ] Title correct
- [ ] Content includes article summary
- [ ] Labels (tags) applied correctly
- [ ] Published date is recent

---

## Rollback Checklist (If Issues)

If something goes wrong, use these steps:

### Step 1: Check Logs First
```bash
# Open browser DevTools → Console tab
# Or check Vercel deployment logs
```

### Step 2: Revert Database If Needed
```sql
-- Reset articles to deduped state
UPDATE articles 
SET status = 'deduped', 
    meta_description = NULL, 
    blogger_post_id = NULL 
WHERE status IN ('enriched', 'published', 'failed');
```

### Step 3: Verify Configuration
- Check system_config has all 4 keys
- Check OAuth token hasn't expired
- Check OpenRouter API key is valid

### Step 4: Test Again
- Run blogger-test endpoint
- Check pipeline-status endpoint
- Check logs for errors

---

## Success Criteria

✓ **Publication is successful when:**

1. **Pipeline Status Shows:**
   - [ ] Articles moved from 'deduped' to 'enriched' to 'published'
   - [ ] No increase in 'failed' count
   - [ ] 'published' count increases with each run

2. **Console Logs Show:**
   - [ ] All 9 STEP logs appear
   - [ ] No ERROR or ✕ messages
   - [ ] Blogger postId returned in STEP 8

3. **Articles Tab Shows:**
   - [ ] Filter by status='published'
   - [ ] Articles have blogger_post_id values
   - [ ] Count increases with each cron run

4. **Blogger Blog Shows:**
   - [ ] New posts appear
   - [ ] Post count increases
   - [ ] Posts are published (or drafts if configured)
   - [ ] Posts have correct content and labels

5. **Cron Logs Show:**
   - [ ] Status = 'success'
   - [ ] articlesProcessed = articlesPublished
   - [ ] No error_message

---

## Monitoring Going Forward

### Daily Checks:
- [ ] Run `/api/debug/pipeline-status` - check for 'failed' articles
- [ ] Check Blogger blog - new posts appearing
- [ ] Check dashboard Logs - recent successful execution

### Weekly Checks:
- [ ] Run `/api/debug/blogger-test` - verify API still working
- [ ] Review failed articles - check for patterns
- [ ] Check cron log history - look for failures

### On Issues:
- [ ] Check STEP logs for exact failure point
- [ ] Use `pipeline-status` to identify stuck articles
- [ ] Use `blogger-test` to verify credentials
- [ ] Check database directly for status inconsistencies

---

## Support Resources

| Question | Resource |
|----------|----------|
| How do I get Blogger blog ID? | `PUBLICATION_DEBUG_GUIDE.md` → Credentials section |
| How do I get OAuth token? | `PUBLICATION_DEBUG_GUIDE.md` → Credentials section |
| What does each STEP mean? | `CODE_CHANGES_SUMMARY.md` → Logging Flow section |
| How do I debug a specific error? | `PUBLICATION_DEBUG_GUIDE.md` → Common Issues section |
| What endpoints are available? | `CODE_CHANGES_SUMMARY.md` → New Endpoints section |

---

## Sign-Off

- [x] All code changes implemented
- [x] Build successful
- [x] 3 new debug endpoints created
- [x] 9-step pipeline logging added
- [x] Blogger API error tracking added
- [x] Status query bug fixed (enriched→deduped)

**Ready to test:** YES ✓
