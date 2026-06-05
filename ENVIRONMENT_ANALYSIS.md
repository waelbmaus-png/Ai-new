# Environment Variables Analysis - Complete Report

## Executive Summary

Based on code analysis of the AI News Automation System:

- **OAuth Implementation**: Direct Google OAuth2 (NO NextAuth)
- **Callback Routes**: NONE REQUIRED
- **Database Config**: Supabase `system_config` table
- **Required Env Vars**: 6 for Vercel, 6 for database
- **Deployment Ready**: Yes, once credentials are configured

---

## 1. Complete Environment Variables List

### A. Vercel Environment Variables (6)

These are set in Vercel Dashboard → Settings → Environment Variables:

```
1. NEXT_PUBLIC_SUPABASE_URL
   Type: String (public, exposed in browser)
   Source: Supabase Dashboard
   Example: https://hiqityhnahldwzjzjiur.supabase.co
   Usage: Client-side Supabase initialization

2. NEXT_PUBLIC_SUPABASE_ANON_KEY
   Type: String (public, safe to expose)
   Source: Supabase Dashboard → Settings → API
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Usage: Client-side Supabase authentication
   File: lib/supabase/client.ts:3-5

3. OPENROUTER_API_KEY
   Type: String (secret, private)
   Source: OpenRouter Dashboard
   Example: sk-or-v1-abc123...
   Usage: AI content enrichment via OpenRouter API
   File: lib/services/ai-enrichment.ts:26

4. CRON_SECRET
   Type: String (secret, private)
   Source: Create your own strong token
   Example: your-super-secret-token-12345
   Usage: Protect cron endpoints from unauthorized access
   File: app/api/cron/fetch-feeds/route.ts:12
         app/api/cron/deduplicate/route.ts:12
         app/api/cron/enrich-and-publish/route.ts:12

5. NEXT_PUBLIC_BASE_URL
   Type: String (public, deployment domain)
   Source: Your deployed app domain
   Example: https://ai-news-automation.vercel.app
   Usage: Base URL for cron job configuration
   File: components/dashboard/settings.tsx:154

6. NEXT_PUBLIC_CRON_SECRET
   Type: String (same as CRON_SECRET)
   Source: Same value as CRON_SECRET
   Example: your-super-secret-token-12345
   Usage: Client-side cron authorization header
   File: components/dashboard/settings.tsx:18
```

### B. Database Configuration Variables (6)

These are stored in Supabase `system_config` table (not env vars):

```
1. blogger_blog_id
   Type: String
   Source: Your Blogger blog URL
   Example: "1234567890"
   Usage: Identify target blog for publishing
   File: lib/services/blogger-api.ts:66, 96

2. blogger_api_key
   Type: String (OAuth access token)
   Source: Google OAuth2 flow
   Example: "ya29.a0AfH6SMBxyz..."
   Usage: Authenticate with Blogger API
   File: lib/services/blogger-api.ts:54-56, 65

3. openrouter_api_key
   Type: String (optional backup)
   Source: OpenRouter Dashboard
   Usage: Fallback if OPENROUTER_API_KEY env var not set
   File: lib/services/ai-enrichment.ts (optional)

4. similarity_threshold
   Type: Number (float between 0 and 1)
   Source: Set manually, default 0.75
   Example: "0.75"
   Usage: Content similarity threshold for deduplication
   File: lib/services/deduplication.ts:130

5. auto_publish_drafts
   Type: Boolean (string "true" or "false")
   Source: Set manually, default "false"
   Example: "true"
   Usage: Auto-publish to Blogger or create drafts only
   File: app/api/cron/enrich-and-publish/route.ts:132

6. ai_model
   Type: String
   Source: Set manually, default "openrouter/auto"
   Example: "openrouter/auto"
   Usage: Select AI model for content enrichment
   File: lib/services/ai-enrichment.ts (if implemented)
```

---

## 2. OAuth2 Implementation Details

### Current Architecture

```
┌─────────────────────┐
│  Google Cloud API   │
└──────────┬──────────┘
           │
      OAuth2.0
           │
┌──────────┴──────────┐
│  Google OAuth2 Flow │
│  (Manual setup)     │
└──────────┬──────────┘
           │
    Access Token
           │
┌──────────┴──────────────────┐
│ Supabase system_config      │
│ Key: blogger_api_key        │
│ Value: ya29.xxxxx...        │
└──────────┬──────────────────┘
           │
┌──────────┴──────────────┐
│  Blogger API Service    │
│  lib/services/blogger-  │
│  api.ts                 │
└──────────┬──────────────┘
           │
    Create Blog Posts
           │
┌──────────┴──────────┐
│  Blogger Blog       │
│  Published Posts    │
└────────────────────┘
```

### Key Points

**Type**: Direct OAuth2 (NOT NextAuth.js)
**Files**: 
- `lib/services/blogger-api.ts` - Direct API calls with stored token
- `app/api/cron/enrich-and-publish/route.ts` - Uses token for publishing
- `app/api/debug/blogger-test/route.ts` - Tests token validity

**No Callback Routes**: 
- ✗ `/api/oauth/callback` - NOT NEEDED
- ✗ `/auth/callback` - NOT NEEDED
- Why? The system stores access tokens directly in database

**Token Refresh**:
- Current: Manual - user must refresh token in Google OAuth Playground
- Future: Can add automatic refresh using refresh_token if needed

---

## 3. Redirect URI Analysis

### Is Redirect URI Used?

**Status**: NO, not used in current implementation

**Why?**
- Standard OAuth flow requires: User → Authorization → Callback → Token
- This app uses: User gets token → Stores in database → API uses it
- No server-side OAuth callback handling needed

### If It Was Used

The redirect URI would be:
```
https://your-domain.com/api/oauth/blogger-callback
```

But this is NOT implemented because we manually handle token storage.

### To Implement (if needed)

Would create: `/app/api/oauth/blogger-callback/route.ts`

But for current deployment: **NOT REQUIRED**

---

## 4. Code References

### Where Each Variable Is Used

**NEXT_PUBLIC_SUPABASE_URL**
```
lib/supabase/client.ts:3
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    ...
```

**OPENROUTER_API_KEY**
```
lib/services/ai-enrichment.ts:26
  const apiKey = process.env.OPENROUTER_API_KEY;
```

**CRON_SECRET**
```
app/api/cron/fetch-feeds/route.ts:12
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret !== req.headers.get('Authorization')?.replace('Bearer ', '')) {
```

**blogger_blog_id & blogger_api_key**
```
lib/services/blogger-api.ts:34-49
  async function getConfig(key: string) {
    const { data } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", key)
      .single();
    return data?.config_value || "";
  }

  async function getAccessToken(): Promise<string> {
    const apiKey = await getConfig("blogger_api_key");
    return apiKey;
  }
```

### API Endpoints Using Variables

| Endpoint | Uses | Required Vars |
|----------|------|---------------|
| `/api/cron/fetch-feeds` | CRON_SECRET | blogger_blog_id |
| `/api/cron/deduplicate` | CRON_SECRET | similarity_threshold |
| `/api/cron/enrich-and-publish` | CRON_SECRET, blogger_api_key | blogger_blog_id, blogger_api_key, auto_publish_drafts |
| `/api/articles` | Supabase auth | NEXT_PUBLIC_SUPABASE_* |
| `/api/debug/blogger-test` | blogger_api_key | blogger_blog_id, blogger_api_key |

---

## 5. Configuration Methods

### For Local Development

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
OPENROUTER_API_KEY=sk-or-v1-...
CRON_SECRET=dev-secret-token-12345
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CRON_SECRET=dev-secret-token-12345
```

### For Vercel Production

1. Go to Vercel Dashboard
2. Project → Settings → Environment Variables
3. Add each public and private variable
4. Redeploy for changes to take effect

### For Database Configuration

1. Go to Supabase Dashboard
2. SQL Editor
3. Run:
```sql
UPDATE system_config SET config_value = 'YOUR_BLOG_ID' 
WHERE config_key = 'blogger_blog_id';

UPDATE system_config SET config_value = 'ya29.xxxxx' 
WHERE config_key = 'blogger_api_key';
```

Or use Supabase UI directly if preferred.

---

## 6. Security Considerations

### Public Variables (Safe to expose)
```
✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY (read-only via RLS)
✓ NEXT_PUBLIC_BASE_URL
✓ NEXT_PUBLIC_CRON_SECRET (can be rotated)
```

### Secret Variables (Keep private)
```
✗ OPENROUTER_API_KEY - DO NOT expose
✗ CRON_SECRET - Store securely, rotate regularly
✗ blogger_api_key - DO NOT expose (in database)
```

### Best Practices
1. Rotate `CRON_SECRET` regularly
2. Use strong random tokens (32+ characters)
3. Never commit `.env.local` to git
4. Monitor API usage for unauthorized access
5. Regenerate OAuth tokens if compromised

---

## 7. Deployment Checklist

### Before Deploying to Vercel

```
Environment Variables:
□ NEXT_PUBLIC_SUPABASE_URL - Check Supabase dashboard
□ NEXT_PUBLIC_SUPABASE_ANON_KEY - Check Supabase settings
□ OPENROUTER_API_KEY - Check OpenRouter dashboard
□ CRON_SECRET - Create strong random token
□ NEXT_PUBLIC_BASE_URL - Match your Vercel domain
□ NEXT_PUBLIC_CRON_SECRET - Match CRON_SECRET

Database Configuration (system_config):
□ blogger_blog_id - Find in your Blogger blog URL
□ blogger_api_key - Get from Google OAuth Playground
□ similarity_threshold - Use default 0.75 or adjust
□ auto_publish_drafts - Set preference (true/false)
□ ai_model - Use default openrouter/auto

Verification:
□ Run /api/debug/blogger-test endpoint
□ Check Dashboard → Settings for all values
□ Monitor first cron run in Dashboard → Logs
□ Verify articles appear on Blogger blog
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **OAuth Type** | Direct Google OAuth2 (NOT NextAuth) |
| **Callback Route** | NOT REQUIRED |
| **Callback URL** | NOT USED |
| **Token Storage** | Supabase database (`system_config`) |
| **Env Variables** | 6 in Vercel |
| **Database Config** | 6 in Supabase |
| **Deployment Type** | Vercel + Supabase |
| **Ready?** | Yes, with credentials setup |

**No OAuth callback needed because the system uses direct token storage model!**
