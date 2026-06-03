# AI News Automation System for Blogger

**Automatically fetch articles from RSS feeds, remove duplicates with AI, enrich with SEO metadata, and publish to Blogger.**

A complete, production-ready automation system that saves you hours of content curation and publication work.

## 🚀 Quick Start (5 Minutes)

1. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

2. **Add environment variables** (NEXT_PUBLIC_SUPABASE_URL, OPENROUTER_API_KEY, etc.)

3. **Visit dashboard**: https://your-domain.com

4. **Add RSS feeds** and click "Fetch Now"

5. **Configure Vercel Crons** for automation

See [QUICK_START.md](./QUICK_START.md) for detailed setup.

## 📚 Documentation

| Document | Purpose | Read When |
|----------|---------|-----------|
| **[QUICK_START.md](./QUICK_START.md)** | 5-minute setup guide | You're just starting |
| **[AI_NEWS_AUTOMATION_README.md](./AI_NEWS_AUTOMATION_README.md)** | Complete system guide | You want to understand the whole system |
| **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** | Detailed deployment | You're deploying to production |
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | API reference | You're using the API |
| **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** | What was built | You want an overview |
| **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** | Verification checklist | You're verifying completeness |

## ✨ Key Features

### 🔄 Automation
- **Fetch**: Automatically pull articles from RSS feeds (every 4 hours)
- **Deduplicate**: Remove duplicate articles intelligently (every 6 hours)
- **Enrich**: Generate SEO metadata with AI (every 8 hours)
- **Publish**: Post directly to Blogger (every 8 hours)

### 📊 Dashboard
- **Overview**: Key metrics, status distribution, recent activity
- **Articles**: Search, filter, edit, publish, delete
- **Feeds**: Manage RSS feeds, trigger manual fetches
- **Logs**: Monitor cron job execution and results
- **Settings**: Complete setup instructions and configuration

### 🤖 AI-Powered
- Generate SEO-optimized meta descriptions
- Extract relevant keywords
- Create article labels/tags
- Produce brief summaries
- Powered by OpenRouter (flexible model selection)

### 🔐 Smart Deduplication
- **Hash-based**: Instant exact match detection
- **Content-based**: Jaccard similarity scoring
- Configurable threshold (default: 0.75)
- Records complete deduplication history

### 📝 Complete Tracking
- Article processing history
- Cron job execution logs
- Error tracking and reporting
- Audit trail for all operations
- Real-time statistics

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐
│     Dashboard UI (Next.js)              │
│  - Overview | Articles | Feeds | Logs   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        API Layer (REST)                 │
│  - /api/articles                        │
│  - /api/feeds                           │
│  - /api/cron/*                          │
│  - /api/dashboard                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    Backend Services                     │
│  - RSS Fetcher                          │
│  - Deduplication Engine                 │
│  - AI Enrichment                        │
│  - Blogger Publisher                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│     Supabase PostgreSQL                 │
│  - rss_feeds                            │
│  - raw_articles                         │
│  - articles                             │
│  - deduplication_records                │
│  - article_history                      │
│  - cron_logs                            │
│  - system_config                        │
└─────────────────────────────────────────┘
```

## 🗄️ Database Schema

7 main tables with relationships and indexes:

- **rss_feeds**: RSS feed sources
- **raw_articles**: Articles fetched from RSS
- **articles**: Deduplicated, enriched articles
- **deduplication_records**: Duplicate tracking
- **article_history**: Complete audit trail
- **cron_logs**: Job execution logs
- **system_config**: System configuration

All optimized with indexes for performance.

## 📡 API Endpoints

### Articles
- `GET /api/articles` - List with pagination, search, filter
- `POST /api/articles` - Create article
- `GET /api/articles/[id]` - Get details
- `PUT /api/articles/[id]` - Update and publish
- `DELETE /api/articles/[id]` - Delete

### Feeds
- `GET /api/feeds` - List all feeds
- `POST /api/feeds` - Add new feed
- `DELETE /api/feeds/[id]` - Remove feed

### Cron Jobs
- `POST /api/cron/fetch-feeds` - Fetch RSS articles
- `POST /api/cron/deduplicate` - Remove duplicates
- `POST /api/cron/enrich-and-publish` - Enrich & publish

### Dashboard
- `GET /api/dashboard/stats` - Overview statistics
- `GET /api/cron-logs` - Job execution logs

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for full reference.

## 🔧 Configuration

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
CRON_SECRET=your-secure-secret
```

### System Configuration
Via database `system_config` table:
- `similarity_threshold`: Dedup threshold (0-1, default 0.75)
- `auto_publish_drafts`: Auto-publish or create drafts (default false)
- `ai_model`: AI model for enrichment (default: openrouter/auto)
- `blogger_api_key`: Blogger OAuth credentials
- `blogger_blog_id`: Target blog ID

## 🚀 Deployment

### Local Development
```bash
pnpm install
pnpm dev
# http://localhost:3000
```

### Vercel Deployment
```bash
vercel deploy
```

### Configure Crons
In Vercel Crons dashboard:
1. Fetch RSS Feeds: `0 */4 * * *` (every 4 hours)
2. Deduplicate: `0 */6 * * *` (every 6 hours)
3. Enrich & Publish: `0 */8 * * *` (every 8 hours)

All require `Authorization: Bearer YOUR_CRON_SECRET` header.

## 📋 Workflow

### 1. Fetch (Every 4 hours)
```
RSS Feeds → Parse → Store in raw_articles → Update feed metadata
```

### 2. Deduplicate (Every 6 hours)
```
raw_articles → Hash Check → Similarity Check → Mark Duplicates
```

### 3. Enrich & Publish (Every 8 hours)
```
Unique Articles → AI Processing → Generate Metadata → Publish to Blogger
```

## 🎯 Use Cases

✅ **Tech News Blog**: Aggregate tech news from multiple sources  
✅ **Industry News Site**: Curate industry-specific content  
✅ **Link Blog**: Share quality content from RSS feeds  
✅ **Content Aggregation**: Combine multiple feeds into one blog  
✅ **SEO Content**: Auto-generate optimized metadata  
✅ **Time Saving**: Eliminate manual content curation  

## 🔒 Security

- ✅ Cron endpoints require secret authorization header
- ✅ Environment variables for all secrets
- ✅ Parameterized queries (SQL injection safe)
- ✅ Supabase built-in security
- ✅ No secrets in code or logs

## ⚡ Performance

- Processes 100+ articles per cycle
- Deduplication: O(n) hash + O(n²) similarity
- AI enrichment: 2-3 seconds per article
- Database queries: Optimized with indexes
- Cron timeout: Under Vercel's 5-minute limit

## 📊 Monitoring

### Real-Time
- Dashboard updates every 30 seconds
- Live article counts
- Current processing status

### Detailed Logs
- Cron job execution history
- Article processing trail
- Error tracking and reporting
- Complete audit log

### Alerts
- Failed cron jobs visible in logs
- API error responses
- Database operation logs

## 🛠️ What's Included

✅ Complete backend services  
✅ Full-featured dashboard  
✅ Cron job infrastructure  
✅ API endpoints  
✅ Database schema  
✅ Error handling  
✅ Logging & monitoring  
✅ Comprehensive documentation  
✅ Production-ready code  
✅ Security best practices  

## 📖 How to Use

### First Time?
1. Start with [QUICK_START.md](./QUICK_START.md)
2. Deploy to Vercel
3. Add RSS feeds
4. Click "Fetch Now"

### Need Details?
Read [AI_NEWS_AUTOMATION_README.md](./AI_NEWS_AUTOMATION_README.md)

### Deploying to Production?
Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

### Building Custom Integrations?
Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### Verifying Everything?
See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)

## 🚨 Troubleshooting

### Articles Not Appearing
→ Check RSS feeds in **Feeds** tab → Click **Fetch Now**

### Not Publishing to Blogger
→ Go to **Settings** tab → Follow Blogger API setup

### Cron Jobs Not Running
→ Verify CRON_SECRET and job URLs in Vercel dashboard

### Dashboard Not Loading
→ Check SUPABASE_URL and ANON_KEY environment variables

Full troubleshooting in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 📈 Scaling

For production use:
- Monitor OpenRouter API usage
- Adjust dedup threshold based on results
- Archive old articles periodically
- Configure backup schedules
- Set up uptime monitoring

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) scaling section.

## 🆘 Support

All information needed is in:
1. **Dashboard Settings tab** - Complete setup guide
2. **Documentation files** - Comprehensive guides
3. **Code comments** - Implementation details
4. **Error messages** - Helpful diagnostics

## 🎓 Learning Resources

### Understanding the System
- [QUICK_START.md](./QUICK_START.md) - 5-minute overview
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - What was built
- [AI_NEWS_AUTOMATION_README.md](./AI_NEWS_AUTOMATION_README.md) - Complete guide

### Getting It Running
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Step-by-step
- [QUICK_START.md](./QUICK_START.md) - Fast setup

### API & Integration
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - All endpoints
- Code in `lib/services/` - Implementation details

### Verification
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Complete checklist

## 🤝 Contributing

To extend this system:
1. Follow existing code patterns
2. Add database migrations for schema changes
3. Update API documentation
4. Add comprehensive error handling
5. Log all operations

## 📜 License

This is your complete system - deploy and use as needed!

## 🎉 Getting Started Now

```bash
# 1. Deploy
vercel deploy

# 2. Add environment variables in Vercel
# NEXT_PUBLIC_SUPABASE_URL, OPENROUTER_API_KEY, CRON_SECRET

# 3. Visit your dashboard
# https://your-domain.com

# 4. Add RSS feeds
# Go to Feeds tab → Add Feed

# 5. Test it
# Click "Fetch Now" button

# 6. Setup crons
# In Vercel Crons dashboard, create 3 jobs

# 7. Watch it work!
# Articles will flow through the system automatically
```

**That's it! You now have a complete AI-powered news automation system!** 🚀

---

**Questions?** Check the documentation files linked above.  
**Ready to start?** Follow [QUICK_START.md](./QUICK_START.md).  
**Want details?** Read [AI_NEWS_AUTOMATION_README.md](./AI_NEWS_AUTOMATION_README.md).
