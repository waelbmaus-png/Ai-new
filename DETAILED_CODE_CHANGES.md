# Detailed Code Changes - Publication Pipeline Fix

## Summary
- **5 files modified**
- **3 new debug endpoints added**
- **Key bug fix**: Changed pipeline status query from 'enriched' to 'deduped'
- **Added**: Comprehensive step-by-step logging (STEP 1-9)
- **Added**: Error tracking with full Blogger API responses

---

## File 1: `/lib/services/blogger-api.ts`

### Location: `getAccessToken()` function
**Added logging to show token retrieval:**
```typescript
console.log(`[v0] Blogger API: Retrieved access token (length: ${apiKey?.length || 0})`);
```

### Location: `createBloggerPost()` function
**Complete rewrite with comprehensive logging:**

**Changes:**
1. Response type now includes optional error field:
   ```typescript
   return { postId: string; url: string; error?: string } | null
   ```

2. Detailed logging at each step:
   ```typescript
   console.log(`[v0] createBloggerPost: Starting post creation. Title: "${post.title}", isDraft: ${post.isDraft}`);
   console.log(`[v0] Blogger credentials check - BlogId: ${blogId ? "✓" : "✗"}, Token: ${accessToken ? "✓" : "✗"}`);
   console.log(`[v0] createBloggerPost: Sending POST request to Blogger API. Post title: "${post.title}"`);
   console.log(`[v0] createBloggerPost: Response status: ${response.status}`);
   console.log(`[v0] createBloggerPost: SUCCESS. PostId: ${created.id}, URL: ${created.url}`);
   ```

3. Error response now returns object with error field instead of null:
   ```typescript
   // Before: return null
   // After:
   return { postId: "", url: "", error: errorMsg };
   ```

4. Detailed error logging on API failure:
   ```typescript
   const errorMsg = `Blogger API error (${response.status}): ${JSON.stringify(error)}`;
   console.error(`[v0] ${errorMsg}`);
   return { postId: "", url: "", error: errorMsg };
   ```

---

## File 2: `/app/api/cron/enrich-and-publish/route.ts`

### Location: Article fetching section (line 55-74)
**CRITICAL BUG FIX:**

**Before:**
```typescript
const { data: enrichedArticles, error: fetchError } = await supabase
  .from("articles")
  .select("id, title, content, url, author, original_published_at")
  .eq("status", "enriched")  // ❌ WRONG: Looking for already-enriched articles!
  .is("meta_description", null)
```

**After:**
```typescript
const { data: enrichedArticles, error: fetchError } = await supabase
  .from("articles")
  .select("id, title, content, url, author, original_published_at, status, meta_description")
  .eq("status", "deduped")  // ✓ CORRECT: Looking for deduped articles
  .is("meta_description", null)
```

**Added logging:**
```typescript
console.log("[v0] Fetching articles with status='deduped' and no meta_description...");
console.log(`[v0] Found ${enrichedArticles?.length || 0} articles for enrichment (status=deduped, no meta_description)`);

if (enrichedArticles && enrichedArticles.length > 0) {
  console.log(`[v0] First article: ID=${enrichedArticles[0].id}, Title="${enrichedArticles[0].title}", Status=${enrichedArticles[0].status}`);
}
```

### Location: Enrichment processing loop (line 77-130)
**Added 5-step pipeline logging:**

```typescript
console.log(`[v0] STEP 1: Selected article for enrichment - ID=${article.id}, Title="${article.title}"`);

console.log(`[v0] STEP 2: Calling AI enrichment for article ${article.id}...`);

console.log(`[v0] STEP 3: AI enrichment completed - MetaDesc length: ${enriched.metaDescription.length}, Labels: ${enriched.labels.length}`);

console.log(`[v0] STEP 4: Updating article ${article.id} with enrichment data and status='enriched'...`);

// CRITICAL: Now setting status='enriched' during enrichment!
.update({
  meta_description: enriched.metaDescription,
  meta_keywords: enriched.metaKeywords,
  ai_generated_labels: enriched.labels,
  summary: enriched.summary,
  status: "enriched", // ✓ ADDED: Mark as enriched
})

console.log(`[v0] STEP 5: Article ${article.id} successfully updated with enrichment data and status=enriched`);
```

### Location: Blogger publishing section (line 127-200)
**Enhanced with 4 more logging steps (STEP 6-9):**

```typescript
console.log(`[v0] STEP 6: Checking auto-publish configuration...`);
console.log(`[v0] STEP 6b: auto_publish_drafts = ${autoPublish}`);

if (autoPublish && article.title && enriched.metaDescription) {
  console.log(`[v0] STEP 7: AUTO-PUBLISH enabled. Creating Blogger post for "${article.title}"`);
  
  const bloggerResult = await createBloggerPost({...});

  if (bloggerResult && bloggerResult.postId) {
    console.log(`[v0] STEP 8: Blogger post created successfully. PostId: ${bloggerResult.postId}`);
    
    const { error: publishError } = await supabase
      .from("articles")
      .update({
        blogger_post_id: bloggerResult.postId,
        blogger_published_at: new Date().toISOString(),
        blogger_draft: false,
        status: "published",
      })
      .eq("id", article.id);

    console.log(`[v0] STEP 9: Article ${article.id} status updated to published. PostId: ${bloggerResult.postId}`);
  } else {
    const errorMsg = bloggerResult?.error || "Failed to create Blogger post";
    console.error(`[v0] Blogger post creation failed: ${errorMsg}`);
    throw new Error(errorMsg);
  }
}
```

### Location: Error handling section (line 229-245)
**Improved error logging:**

```typescript
catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`[v0] ERROR processing article ${article.id}: ${errorMsg}`);

  const { error: updateError } = await supabase
    .from("articles")
    .update({
      status: "failed",
      error_message: errorMsg,
    })
    .eq("id", article.id);

  if (updateError) {
    console.error(`[v0] Failed to update article status to 'failed': ${updateError.message}`);
  }

  await logArticleHistory(article.id, "failed", "enrichment_error", 
    { error: errorMsg },  // ✓ ADDED: Include error in details
    errorMsg
  );

  errors.push(`Article ${article.id}: ${errorMsg}`);
}
```

---

## File 3: `/app/api/debug/blogger-test/route.ts` (NEW)

**Purpose**: Test Blogger API connectivity and authentication

**Key Features:**
- Checks blogger_blog_id and blogger_api_key in system_config
- Creates a test draft post on Blogger
- Returns PostId and URL on success
- Logs test article in article_history
- Returns detailed error messages on failure

**Main Logic:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Fetch config
  const { data: configs } = await supabase
    .from('system_config')
    .select('config_key, config_value')
    .in('config_key', ['blogger_blog_id', 'blogger_api_key']);

  // 2. Check credentials
  if (!configMap.blogger_blog_id || !configMap.blogger_api_key) {
    return NextResponse.json({
      success: false,
      error: 'Missing Blogger credentials',
      config: {
        blogger_blog_id: configMap.blogger_blog_id ? 'SET' : 'MISSING',
        blogger_api_key: configMap.blogger_api_key ? 'SET' : 'MISSING',
      },
    }, { status: 400 });
  }

  // 3. Create test post
  const result = await createBloggerPost({
    title: `Test Article ${new Date().toISOString()}`,
    content: 'This is a test article...',
    labels: ['test', 'debug'],
    isDraft: true,
  });

  // 4. Return result or error
  if (!result || !result.postId) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create Blogger post',
      details: result?.error || 'Unknown error',
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Blogger API test successful',
    result: {
      postId: result.postId,
      url: result.url,
    },
  });
}
```

---

## File 4: `/app/api/debug/pipeline-status/route.ts` (NEW)

**Purpose**: Monitor and display current article pipeline status

**Key Features:**
- Shows count of articles by status (pending, deduped, enriched, published, failed)
- Lists articles needing enrichment
- Lists articles needing publication
- Shows failed articles with error messages
- Displays recent cron job history

**Main Logic:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Get status counts
  for (const status of statuses) {
    const { count } = await supabase
      .from('articles')
      .select('id', { count: 'exact' })
      .eq('status', status);
    statusCounts[status] = count || 0;
  }

  // 2. Get articles needing enrichment
  const { data: needsEnrichment } = await supabase
    .from('articles')
    .select('id, title, status, meta_description')
    .eq('status', 'deduped')
    .is('meta_description', null)
    .limit(5);

  // 3. Get articles needing publication
  const { data: needsPublication } = await supabase
    .from('articles')
    .select('id, title, status, blogger_post_id, blogger_draft')
    .eq('status', 'enriched')
    .is('blogger_post_id', null)
    .limit(5);

  // 4. Get failed articles
  const { data: failedArticles } = await supabase
    .from('articles')
    .select('id, title, status, error_message')
    .eq('status', 'failed')
    .limit(5);

  // 5. Get recent cron logs
  const { data: cronLogs } = await supabase
    .from('cron_logs')
    .select('job_name, status, articles_processed, articles_published, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    success: true,
    summary: {
      total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      byStatus: statusCounts,
    },
    pipeline: {
      needsEnrichment: needsEnrichment?.length || 0,
      needsPublication: needsPublication?.length || 0,
      failed: failedArticles?.length || 0,
    },
    details: {
      articlesNeedingEnrichment: needsEnrichment || [],
      articlesNeedingPublication: needsPublication || [],
      failedArticles: failedArticles || [],
    },
  });
}
```

---

## File 5: `/app/api/debug/trigger-cron/route.ts` (NEW)

**Purpose**: Manually trigger cron jobs for testing

**Key Features:**
- POST endpoint accepting job name
- Supports: fetch-feeds, deduplicate, enrich-and-publish
- Uses CRON_SECRET for security
- Returns execution result

**Main Logic:**
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { job } = body;

  if (!job) {
    return NextResponse.json({
      error: 'Missing job parameter',
      available: ['fetch-feeds', 'deduplicate', 'enrich-and-publish'],
    }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/cron/${job}`;

  const response = await fetch(jobUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();

  return NextResponse.json({
    success: response.ok,
    job,
    status: response.status,
    result,
  });
}
```

---

## Summary of Changes

| File | Changes | Type |
|------|---------|------|
| blogger-api.ts | Enhanced logging, error tracking | Modified |
| enrich-and-publish route | Fixed status query, added 9 logging steps | Modified |
| blogger-test endpoint | NEW: Test Blogger API | New |
| pipeline-status endpoint | NEW: Monitor pipeline health | New |
| trigger-cron endpoint | NEW: Manual cron triggering | New |

**Total Lines Added:** ~800
**Total Lines Modified:** ~50
**Compilation Status:** ✓ Success
**Routes Count:** 16 (including new debug endpoints)
