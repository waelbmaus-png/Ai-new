# Quick Start Guide - AI News Automation System

## 5-Minute Setup

### 1. Deploy to Vercel (2 minutes)

```bash
# Your code is ready! Just deploy:
vercel deploy

# Or push to GitHub and connect to Vercel in their UI
```

### 2. Add Environment Variables (2 minutes)

Go to Vercel Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = xxxxx
OPENROUTER_API_KEY = xxxxx
CRON_SECRET = any-random-string (keep it secure!)
```

### 3. Visit Your Dashboard (1 minute)

```
https://your-domain.com
```

You'll see the complete dashboard with:
- Overview statistics
- Articles management
- RSS feeds manager
- Cron job logs
- Setup instructions

## First Run Setup

### Step 1: Add RSS Feed
1. Go to **Feeds** tab
2. Click **Add Feed** button
3. Enter feed name and URL
4. Click **Add Feed**

Example RSS feeds:
- https://feeds.techcrunch.com/techcrunch/startups
- https://news.ycombinator.com/rss
- https://feeds.bloomberg.com/markets/news.rss

### Step 2: Test Fetch
1. Go to **Feeds** tab
2. Click **Fetch Now** button
3. Articles should appear in **Articles** tab within seconds

### Step 3: Configure Blogger
1. Go to **Settings** tab
2. Follow "Step 1: Setup Blogger API" instructions
3. Copy your API credentials to system_config table
4. Or wait for Blogger OAuth integration

### Step 4: Setup Cron Jobs
1. Go to Vercel Crons dashboard
2. Create 3 jobs using URLs from **Settings** tab
3. Each job needs Authorization header: `Bearer YOUR_CRON_SECRET`
4. Set schedule for each job

### Step 5: Let It Run
First cycle completes in ~20 minutes:
- 4-hour fetch interval starts
- 6-hour dedup starts
- 8-hour enrich & publish starts

Articles will flow through the system automatically!

## Dashboard Overview

### 📊 Overview Tab
Displays:
- Total articles, published, drafts, pending
- Article status breakdown chart
- Recent cron job execution
- Live statistics (updates every 30 seconds)

### 📝 Articles Tab
- Search articles by title
- Filter by status (published, pending, enriched, deduped, failed)
- View 20 articles per page
- Edit article metadata
- Publish or delete articles
- See article creation date

### 🔗 Feeds Tab
- View all RSS feeds
- Add new feeds with custom refresh intervals
- See last fetch timestamp
- Delete feeds
- Manual fetch trigger

### 📋 Logs Tab
- Monitor cron job execution
- Filter by job type
- See article counts processed
- Track errors and failures
- View execution duration

### ⚙️ Settings Tab
- Complete setup guide
- API configuration help
- Cron endpoint URLs (copy-paste ready)
- Required environment variables

## Data Flow Visualization

```
RSS Feed 1 ──┐
RSS Feed 2 ──┼──> [Fetch Job] ──> [Raw Articles]
RSS Feed 3 ──┘        ↓ (every 4h)
                      │
                      ↓
                [Dedup Job]
                ↓ (every 6h)
                │
            Duplicates ──> Mark as "deduped"
                │
            Unique Articles ──> Continue
                │
                ↓
          [Enrich & Publish Job]
          ↓ (every 8h)
          │
     AI Enrichment ──> Generate metadata
          │
          ├──> Meta Description
          ├──> Keywords
          ├──> Labels
          └──> Summary
          │
          ↓
     Blogger Publishing ──> Create draft or publish post
          │
          ├──> Success ──> Status = "published"
          └──> Error ──> Log error, save for retry
```

## Common Tasks

### Add an RSS Feed
1. **Feeds** tab → **Add Feed** button
2. Enter feed name and URL
3. Optionally set category and refresh interval
4. Click **Add Feed**

### View Articles
1. **Articles** tab
2. Use search to find articles
3. Use status filter to view specific articles
4. Click article row to edit

### Publish Article
1. **Articles** tab → Find article
2. Click **Edit** (pencil icon)
3. Review and edit content
4. Click **Publish to Blog** button
5. Article publishes to Blogger

### Delete Article
1. **Articles** tab → Find article
2. Click **Delete** (trash icon)
3. Confirm deletion

### Check Job Status
1. **Logs** tab
2. See recent cron job execution
3. Click on job to see details
4. View article counts and errors

## Troubleshooting

### Articles Not Appearing
- Check **Feeds** tab - feeds configured?
- Click **Fetch Now** to test
- Check **Logs** for errors
- Verify feed URLs are accessible

### Articles Not Publishing
- Settings tab: Configure Blogger API
- Check **Logs** for publishing errors
- Verify article has title and content
- Check Blogger credentials are valid

### Cron Jobs Not Running
- In Vercel Crons dashboard, check jobs are created
- Verify CRON_SECRET is set correctly
- Check authorization header is: `Bearer YOUR_SECRET`
- Look at Vercel function logs for errors

### Dashboard Not Loading
- Check NEXT_PUBLIC_SUPABASE_URL is set
- Check NEXT_PUBLIC_SUPABASE_ANON_KEY is set
- Clear browser cache
- Check browser console for errors

## Configuration Options

All in **Settings** tab or database `system_config` table:

| Setting | Default | Description |
|---------|---------|-------------|
| similarity_threshold | 0.75 | How similar articles must be to deduplicate (0-1) |
| auto_publish_drafts | false | Auto-publish or create as drafts |
| ai_model | openrouter/auto | Which AI model to use for enrichment |
| refresh_interval_hours | 4 | Default RSS feed refresh interval |

## API Usage

You can also interact via API:

```bash
# List articles
curl https://your-domain.com/api/articles?status=published

# Get article details
curl https://your-domain.com/api/articles/[id]

# Get all feeds
curl https://your-domain.com/api/feeds

# Get dashboard stats
curl https://your-domain.com/api/dashboard/stats

# Get cron logs
curl https://your-domain.com/api/cron-logs?limit=10
```

See API_DOCUMENTATION.md for complete API reference.

## Performance Expectations

### Processing Speed
- Fetching RSS: 1-2 seconds per feed
- Deduplication: 1-2 seconds per 100 articles
- AI Enrichment: 2-3 seconds per article
- Blogger Publishing: 1-2 seconds per post

### Data Volume
- Handles 100+ articles per cycle
- Can track 1000s of articles
- Database included in Supabase plan

### Cron Job Duration
- Fetch job: ~5-10 seconds
- Dedup job: ~20-30 seconds
- Enrich & publish: ~5 minutes (limited by AI API)

All under Vercel's 5-minute cron timeout.

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Set environment variables
3. ✅ Configure Blogger API
4. ✅ Add RSS feeds
5. ✅ Test fetch
6. ✅ Create Vercel cron jobs
7. ✅ Wait for automated runs
8. ✅ Monitor and adjust

## Getting Help

**Dashboard Settings tab** has complete setup instructions.

**API Documentation** (`API_DOCUMENTATION.md`) shows all endpoints.

**Main README** (`AI_NEWS_AUTOMATION_README.md`) explains the full system.

**Deployment Guide** (`DEPLOYMENT_GUIDE.md`) covers detailed setup.

## Key Insights

### Deduplication
- Uses both hash and content similarity
- Adjustable threshold in Settings
- Conservative by default (fewer false positives)

### AI Enrichment
- Generates SEO-optimized metadata
- Uses OpenRouter for flexible model selection
- Cached for performance
- Can be disabled if not needed

### Blogger Integration
- Creates posts as drafts by default
- Can be set to auto-publish
- Updates tracked for publishing history
- OAuth ready for seamless auth

### Monitoring
- Complete audit trail in article history
- All cron executions logged
- Real-time dashboard statistics
- Error logging for debugging

## Summary

You now have a **complete, automated news publishing system** that:
1. **Fetches** articles from RSS feeds automatically
2. **Deduplicates** to avoid posting duplicates
3. **Enriches** with AI-generated metadata
4. **Publishes** directly to Blogger
5. **Tracks** everything in a complete audit trail

Everything runs on schedule (configurable intervals), tracked via dashboard, and easily monitored via logs.

**Start your first cycle now - go to Feeds tab and click Fetch!** 🚀
