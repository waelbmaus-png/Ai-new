# Environment Variables - Quick Reference Card

## In 60 Seconds

### What Your App Needs

**Vercel (Settings → Environment Variables)**
```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...
OPENROUTER_API_KEY = sk-or-v1-xxxxx
CRON_SECRET = your-secret-token
NEXT_PUBLIC_BASE_URL = https://your-domain.com
NEXT_PUBLIC_CRON_SECRET = your-secret-token
```

**Supabase (Dashboard → system_config table)**
```
blogger_blog_id = 1234567890
blogger_api_key = ya29.xxxxx (Google access token)
openrouter_api_key = sk-or-v1-xxxxx (optional backup)
similarity_threshold = 0.75
auto_publish_drafts = false (or true)
ai_model = openrouter/auto
```

---

## How to Get Blogger Access Token

1. **Google Cloud Console** → Enable Blogger API
2. **Create OAuth2 Credentials** (Desktop app)
3. **Get Authorization Code** from [Google OAuth Playground](https://developers.google.com/oauthplayground)
   - Scopes: `https://www.googleapis.com/auth/blogger`
   - Get authorization code
4. **Exchange for Access Token**:
   ```bash
   curl -X POST https://oauth2.googleapis.com/token \
     -d "client_id=YOUR_ID" \
     -d "client_secret=YOUR_SECRET" \
     -d "code=AUTH_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
   ```
5. **Copy `access_token`** from response
6. **Paste in system_config** as `blogger_api_key`

---

## OAuth2 Architecture

```
NO OAUTH CALLBACK NEEDED ✓

User manually gets token from Google
         ↓
Stores in database
         ↓
API uses token directly
         ↓
No /api/oauth/callback route required
```

**Why?** The system stores access tokens directly, not using server-side OAuth flow.

---

## Quick Checklist

- [ ] Supabase URL added to Vercel env vars
- [ ] Blogger blog ID found and stored in database
- [ ] Google OAuth token obtained and stored
- [ ] OpenRouter API key added to Vercel env vars
- [ ] CRON_SECRET created and stored in both places
- [ ] Test with `/api/debug/blogger-test`
- [ ] Monitor `/api/debug/pipeline-status`

**Status**: Ready to deploy when all checked! ✓

---

## Key Points

| Item | Type | Where | Example |
|------|------|-------|---------|
| Supabase URL | Public | Vercel env | `https://xxx.supabase.co` |
| Supabase Key | Public | Vercel env | `eyJhbG...` |
| OpenRouter Key | Secret | Vercel env | `sk-or-v1-...` |
| CRON_SECRET | Secret | Vercel env | `abc123...` |
| Blogger Blog ID | Public | Database | `1234567890` |
| Blogger Token | Secret | Database | `ya29.xxx...` |

**No NextAuth** - Uses direct Google OAuth2 tokens  
**No Callback Route** - Manual token storage model  
**All Set!** - Ready for production deployment
