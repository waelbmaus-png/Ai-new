# Environment Variables Guide - AI News Automation System

## Overview
The system uses **two types** of configuration:
1. **Application Environment Variables** - Set in Vercel/Deployment environment
2. **Database Configuration** - Stored in Supabase `system_config` table (managed via Dashboard)

---

## Part 1: Vercel Environment Variables

These MUST be added to your Vercel project settings or `.env.local` file for local development.

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | String | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | String | Supabase anonymous key (public) | `eyJhbG...` (public, safe to expose) |
| `OPENROUTER_API_KEY` | String | OpenRouter API key for AI enrichment | `sk-or-v1-xxxxx` |
| `CRON_SECRET` | String | Secret token for protecting cron endpoints | `your-secret-token-12345` |
| `NEXT_PUBLIC_BASE_URL` | String | Base URL of your deployed app | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_CRON_SECRET` | String | Same as CRON_SECRET (public) | `your-secret-token-12345` |

### How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with the appropriate value
4. Variables starting with `NEXT_PUBLIC_` are publicly exposed (use non-sensitive values only)
5. Redeploy after adding/updating variables

---

## Part 2: Database Configuration (system_config Table)

These values are stored in Supabase and managed through the Dashboard UI.

### Configuration Keys

All configurations are stored in the `system_config` table with these keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `blogger_blog_id` | String | (empty) | Your Blogger blog ID from blog URL |
| `blogger_api_key` | String | (empty) | Google OAuth2 access token for Blogger API |
| `openrouter_api_key` | String | (empty) | OpenRouter API key (fallback) |
| `similarity_threshold` | Number | `0.75` | Threshold for content similarity deduplication |
| `auto_publish_drafts` | Boolean | `false` | Auto-publish to Blogger or create drafts only |
| `ai_model` | String | `openrouter/auto` | AI model selection for content enrichment |

### How to Set via Dashboard

1. Go to Dashboard → Settings tab
2. Scroll to **Database Configuration** section
3. Update values directly in the database via API or Supabase console

---

## Part 3: OAuth2 for Blogger (Direct Integration)

**Current Implementation**: Direct Google OAuth2 (No NextAuth)

The system uses **direct Google OAuth2 access tokens** stored in the database.

### OAuth2 Flow

```
Google Cloud Console
    ↓
(Get Client ID & Secret)
    ↓
Generate Refresh Token manually
    ↓
Store Access Token in system_config
    ↓
Use token to call Blogger API
    ↓
(No OAuth callback routes needed)
```

### Key Points

- **No OAuth callback route** - The system doesn't handle OAuth redirects in the app
- **Direct token storage** - You manually obtain and store the token in the database
- **No NextAuth.js** - Uses direct Google API calls instead
- **Refresh token optional** - Current version stores static access token

### OAuth2 Credentials Setup

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Search for "Blogger API"
4. Click "Enable API"

#### Step 2: Create OAuth2 Credentials

1. Go to **Credentials** (left sidebar)
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Choose **Desktop application**
4. Download the credentials JSON file
5. Save:
   - `GOOGLE_CLIENT_ID` - Client ID from JSON
   - `GOOGLE_CLIENT_SECRET` - Client Secret from JSON

#### Step 3: Get Authorization Code & Refresh Token

Use Google's OAuth2 Playground or direct API call:

```bash
# 1. Create authorization URL
# Replace with your CLIENT_ID and REDIRECT_URI
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

Response:
```json
{
  "access_token": "ya29.xxxxx",
  "expires_in": 3599,
  "refresh_token": "1//xxxxx",
  "scope": "https://www.googleapis.com/auth/blogger",
  "token_type": "Bearer"
}
```

#### Step 4: Store in Database

1. Copy the `access_token`
2. Go to Supabase Console
3. Insert/Update in `system_config` table:
   - Key: `blogger_api_key`
   - Value: `ya29.xxxxx` (your access token)

---

## Part 4: Blogger Blog ID

### How to Find Your Blog ID

1. Go to [Blogger.com](https://www.blogger.com)
2. Click on your blog
3. Look at the URL: `https://www.blogger.com/blog/posts/BLOG_ID`
4. Copy the `BLOG_ID` number

### Store in Database

1. Go to Supabase Console
2. Insert/Update in `system_config` table:
   - Key: `blogger_blog_id`
   - Value: Your blog ID number (e.g., `1234567890`)

---

## Part 5: Redirect URI Information

### Current Implementation Status

**Status**: ✗ No OAuth callback route needed

**Why**: The system uses direct token storage, not server-side OAuth flow.

**Redirect URI not used because**:
- User manually obtains access token from Google OAuth Playground
- Token is stored directly in database
- No server-side OAuth callback handling needed
- No `/auth/callback` or `/api/oauth/callback` route required

### If You Wanted to Implement Refresh Flow

If future enhancement adds automatic token refresh, you would use:

```
Redirect URI: https://your-domain.com/api/oauth/blogger-callback
```

And create a route at: `/app/api/oauth/blogger-callback/route.ts`

But this is **not required** for current deployment.

---

## Verification Checklist

Before deploying, verify:

### Vercel Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `OPENROUTER_API_KEY` is set
- [ ] `CRON_SECRET` is set and strong
- [ ] `NEXT_PUBLIC_BASE_URL` matches your domain
- [ ] `NEXT_PUBLIC_CRON_SECRET` matches `CRON_SECRET`

### Database Configuration (system_config)
- [ ] `blogger_blog_id` is set to your blog ID
- [ ] `blogger_api_key` contains valid access token
- [ ] `openrouter_api_key` is set for AI enrichment
- [ ] `similarity_threshold` is `0.75` (or your preferred value)
- [ ] `auto_publish_drafts` is `true` or `false` (your preference)
- [ ] `ai_model` is set to `openrouter/auto` or preferred model

### Test Endpoints
- [ ] Run `/api/debug/blogger-test` - Should succeed with post creation
- [ ] Run `/api/debug/pipeline-status` - Should show article counts
- [ ] Check Dashboard → Logs for successful cron runs

---

## Troubleshooting

### Blogger Post Creation Fails
- [ ] Check `blogger_api_key` is valid access token
- [ ] Check `blogger_blog_id` is correct
- [ ] Token might be expired - get new one from Google OAuth Playground
- [ ] Run `/api/debug/blogger-test` to see exact error

### OpenRouter AI Enrichment Fails
- [ ] Check `OPENROUTER_API_KEY` is correct in Vercel
- [ ] API key should start with `sk-or-v1-`
- [ ] Check OpenRouter dashboard for account status/credits
- [ ] Run test and check error message in logs

### Cron Jobs Not Running
- [ ] Check `CRON_SECRET` matches between Vercel and Vercel Crons settings
- [ ] Verify cron endpoint URLs are correct
- [ ] Check Authorization header includes `Bearer YOUR_CRON_SECRET`
- [ ] View cron logs in Dashboard → Logs tab

---

## Summary Table

| Component | Auth Type | Storage | Requires Callback? |
|-----------|-----------|---------|-------------------|
| Supabase | API Key | Vercel env vars | No |
| Blogger | OAuth2 | Database config | No |
| OpenRouter | API Key | Vercel env vars | No |
| Cron Jobs | Bearer Token | Vercel env vars | No |

**Conclusion**: No OAuth callback route needed. System uses direct token storage model.
