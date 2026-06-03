# AI News Automation System for Blogger

A complete automation system that fetches articles from RSS feeds, deduplicates them intelligently, enriches them with AI-generated metadata, and publishes them to your Blogger blog.

## Features

- **RSS Feed Management**: Add and manage multiple RSS feeds to pull articles from
- **Intelligent Deduplication**: Uses both hash-based and content-based similarity to avoid duplicates
- **AI-Powered Enrichment**: Generates SEO-optimized meta descriptions, keywords, and labels using OpenRouter AI
- **Blogger Integration**: Automatically publishes articles as drafts or live posts
- **Cron Job Automation**: Three automated jobs handle fetching, deduplication, and publishing
- **Comprehensive Dashboard**: Track article status, view logs, manage feeds, and adjust settings
- **Article History**: Complete audit trail of every article's processing journey
- **Manual Control**: Edit and publish articles manually through the dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard UI (Next.js)                   │
│  - Overview Stats | Articles List | Feeds Manager | Logs     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│  - /api/articles | /api/feeds | /api/cron-* | /api/dashboard│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Backend Services                           │
│  - RSS Fetcher | Deduplication | AI Enrichment | Blogger API│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database (PostgreSQL)                  │
│  - rss_feeds | raw_articles | articles | deduplication_*   │
│  - article_history | cron_logs | system_config              │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Main Tables

- **rss_feeds**: Stores RSS feed sources
- **raw_articles**: Articles fetched from RSS (before deduplication)
- **articles**: Deduplicated, enriched articles ready for publishing
- **deduplication_records**: Tracks which articles are duplicates
- **article_history**: Complete audit trail of each article's processing
- **cron_logs**: Execution logs of automated jobs
- **system_config**: Configuration settings (API keys, thresholds, etc.)

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and pnpm
- Supabase account (PostgreSQL database)
- Google Cloud account (for Blogger API)
- OpenRouter account (for AI features)
- Vercel project (for cron jobs)

### 2. Database Setup

The database schema is automatically created when you deploy. Tables include:
- RSS feeds management
- Article storage with full metadata
- Deduplication records with hash and similarity scoring
- Complete history tracking for audit purposes
- Cron job execution logs

### 3. Environment Variables

Add these to your Vercel project settings:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AI Enrichment
OPENROUTER_API_KEY=your-openrouter-api-key

# Cron Security
CRON_SECRET=your-secure-random-secret

# Optional: Base URL for cron job configuration
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 4. Blogger API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the "Blogger API"
4. Create OAuth 2.0 credentials (Desktop application)
5. Download the credentials JSON
6. Get your Blog ID from your Blogger blog URL: `https://www.blogger.com/blog/posts/{BLOG_ID}`
7. Update system configuration (via database or dashboard)

### 5. Vercel Cron Setup

Configure three cron jobs in Vercel Crons dashboard:

#### Job 1: Fetch RSS Feeds
- **Endpoint**: `POST /api/cron/fetch-feeds`
- **Schedule**: Every 4 hours (e.g., `0 */4 * * *`)
- **Header**: `Authorization: Bearer YOUR_CRON_SECRET`

#### Job 2: Deduplicate
- **Endpoint**: `POST /api/cron/deduplicate`
- **Schedule**: Every 6 hours (e.g., `0 */6 * * *`)
- **Header**: `Authorization: Bearer YOUR_CRON_SECRET`

#### Job 3: Enrich & Publish
- **Endpoint**: `POST /api/cron/enrich-and-publish`
- **Schedule**: Every 8 hours (e.g., `0 */8 * * *`)
- **Header**: `Authorization: Bearer YOUR_CRON_SECRET`

## Workflow

### 1. RSS Fetching (Every 4 hours)
```
RSS Feed URLs → Fetch Articles → Store in raw_articles table
```
- Fetches new articles from configured RSS feeds
- Stores raw article data with feed source
- Updates last_fetched_at timestamp

### 2. Deduplication (Every 6 hours)
```
raw_articles → Hash Check → Content Similarity → Mark Duplicates
```
- Compares URL hashes for quick exact matches
- Runs content similarity scoring on remaining articles
- Configurable similarity threshold (default: 0.75)
- Records deduplication results for audit trail

### 3. AI Enrichment & Publishing (Every 8 hours)
```
Unique Articles → AI Processing → Generate Metadata → Publish to Blogger
```
- Calls OpenRouter AI to generate:
  - SEO-optimized meta descriptions
  - Relevant keywords
  - Article labels/tags
  - Brief summaries
- Creates Blogger posts (drafts or published)
- Updates article status and Blogger post IDs
- Logs all operations for audit trail

## Dashboard Usage

### Overview Tab
- Key metrics: Total articles, published, drafts, pending
- Status distribution chart
- Recent cron job execution status

### Articles Tab
- Search and filter articles by status
- View article details and metadata
- Edit titles, content, and labels
- Publish drafted articles
- Delete articles if needed
- Pagination support for large datasets

### Feeds Tab
- View all configured RSS feeds
- Add new feeds with custom refresh intervals
- Delete feeds
- Manually trigger feed fetch
- View last fetched timestamp

### Logs Tab
- Monitor cron job execution
- Filter by job type
- View processing statistics
- Track errors and failures
- See execution duration

### Settings Tab
- Complete setup instructions
- API credential configuration guidance
- Cron job endpoint URLs (copy-to-clipboard)
- Environment variable checklist

## API Endpoints

### Articles
- `GET /api/articles` - List articles with pagination, search, status filter
- `POST /api/articles` - Create article manually
- `GET /api/articles/[id]` - Get article details with history
- `PUT /api/articles/[id]` - Update article and publish option
- `DELETE /api/articles/[id]` - Delete article

### Feeds
- `GET /api/feeds` - List all RSS feeds
- `POST /api/feeds` - Add new RSS feed

### Cron Jobs
- `POST /api/cron/fetch-feeds` - Fetch articles from RSS feeds
- `POST /api/cron/deduplicate` - Deduplicate articles
- `POST /api/cron/enrich-and-publish` - Enrich with AI and publish

### Dashboard
- `GET /api/dashboard/stats` - Get overview statistics

### Logs
- `GET /api/cron-logs` - Get cron job logs with pagination

## Configuration

### Deduplication Threshold
Stored in `system_config` table as `similarity_threshold` (default: 0.75).
Values range from 0 to 1:
- 0.75-0.85: Conservative (fewer false positives)
- 0.85-0.95: Moderate
- 0.95+: Aggressive (may miss some duplicates)

### Auto-Publish
Set `auto_publish_drafts` to `true` in `system_config` to automatically publish articles to Blogger. Otherwise, they're created as drafts for manual review.

### AI Model
Configure `ai_model` in `system_config`. Default: `openrouter/auto`

## Deduplication Strategy

The system uses a two-stage approach:

### Stage 1: Hash-Based (Fast)
- MD5 hash of URL
- MD5 hash of title
- Exact match detection
- Fast, zero false negatives for exact duplicates

### Stage 2: Content Similarity (Thorough)
- Checks SHA256 content hash for exact matches
- Compares recent articles using Jaccard similarity
- Configurable threshold for matching
- Catches variations and similar content

## Monitoring & Debugging

### Article History
Each article has a complete history log showing:
- When it was fetched
- Deduplication results
- AI enrichment details
- Publishing status
- Any errors encountered

### Cron Logs
Track:
- Job execution time and duration
- Articles processed and published counts
- Error messages for failures
- Processing details in JSON

### Console Logs
Look for `[v0]` prefix in server logs for debugging information.

## Error Handling

- **Failed feeds**: Logged but don't block other feeds
- **Deduplication errors**: Logged with article ID
- **AI enrichment failures**: Falls back to manual entry
- **Blogger API errors**: Creates draft, user can retry
- **All errors**: Recorded in article history for audit trail

## Performance Considerations

- Cron jobs timeout after 5 minutes (Vercel limit)
- Processes up to 100 raw articles per dedup job
- Processes up to 50 enrichment articles per job
- Index optimization for status and date queries
- Efficient Jaccard similarity calculation

## Security

- Cron endpoints protected with secret authorization header
- Supabase credentials stored in environment variables
- No sensitive data in logs
- API keys should be rotated regularly
- All database access uses parameterized queries

## Troubleshooting

### Cron jobs not running
- Check CRON_SECRET is set correctly
- Verify endpoint URLs are correct
- Check Vercel Crons dashboard for errors
- Ensure authorization headers are included

### No articles being fetched
- Verify RSS feed URLs are correct and accessible
- Check OpenRouter API key is valid
- Verify Supabase connection
- Check feed format (must be valid RSS/Atom)

### Articles not publishing to Blogger
- Verify Blogger API credentials are set
- Check blog ID is correct
- Ensure OAuth token is still valid
- Check article has required fields (title, content)

### High deduplication rate
- Adjust similarity_threshold in system_config
- Check if adding too similar feeds
- Verify feeds aren't overlapping content

## Future Enhancements

Potential features to add:
- OAuth flow for Blogger authentication
- Image handling and optimization
- Multi-language support
- Custom content templates
- Schedule article publishing
- Webhook notifications
- Analytics dashboard
- Content approval workflow
- Custom field mapping
- Feed content filtering

## Support

For issues or questions, check:
1. The dashboard Settings tab for setup instructions
2. Cron logs for execution details
3. Article history for processing trail
4. Browser console for client-side errors
5. Vercel logs for server errors
