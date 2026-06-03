# Deployment Guide for AI News Automation System

## Quick Start

### 1. Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

### 2. Deploy to Vercel

The easiest way to deploy is using the Vercel CLI or GitHub integration.

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

#### Option B: GitHub Integration
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Connect your GitHub repository
4. Vercel auto-detects Next.js and deploys on push

### 3. Configure Environment Variables

In Vercel project settings, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENROUTER_API_KEY=your-openrouter-key
CRON_SECRET=your-random-secret-string
```

### 4. Setup Vercel Crons

In Vercel project settings → Crons, create three cron jobs:

**Job 1: Fetch RSS Feeds**
- URL: `https://your-domain.com/api/cron/fetch-feeds`
- Schedule: `0 */4 * * *` (every 4 hours)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 2: Deduplicate**
- URL: `https://your-domain.com/api/cron/deduplicate`
- Schedule: `0 */6 * * *` (every 6 hours)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

**Job 3: Enrich & Publish**
- URL: `https://your-domain.com/api/cron/enrich-and-publish`
- Schedule: `0 */8 * * *` (every 8 hours)
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

### 5. Configure Blogger API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable "Blogger API"
4. Create OAuth credentials (Desktop app)
5. Get your Blog ID from Blogger URL
6. Store credentials securely

### 6. Test the System

1. Visit your deployed dashboard
2. Go to Settings tab to verify setup
3. Add at least one RSS feed
4. Click "Fetch Now" to test
5. Check Overview tab for articles
6. Configure Crons to run automatically

## Production Checklist

- [ ] Supabase database is backed up
- [ ] All environment variables are set
- [ ] CRON_SECRET is strong and unique
- [ ] Blogger API credentials are configured
- [ ] OpenRouter API key is active and funded
- [ ] RSS feeds are verified and working
- [ ] Vercel Crons are configured with correct schedule
- [ ] Test cron jobs run successfully
- [ ] Article publishing to Blogger works
- [ ] Dashboard is accessible and functional

## Monitoring

### Daily
- Check Overview stats for processing
- Verify recent articles are appearing
- Check if Blogger posts are being created

### Weekly
- Review Cron Logs for failures
- Check Article History for errors
- Monitor OpenRouter API usage

### Monthly
- Review overall article quality
- Adjust similarity threshold if needed
- Update RSS feeds if needed

## Troubleshooting Deployment

### Cron jobs not triggering
- Verify environment variables are set
- Check Vercel Crons dashboard
- Ensure headers are formatted correctly
- Check job URLs are accessible

### Database connection failing
- Verify Supabase credentials
- Check database is not in readonly mode
- Verify IP allowlist if configured
- Test with Supabase dashboard

### Articles not fetching
- Verify RSS feed URLs are correct
- Check if feeds are accessible
- Test feed URLs in RSS reader
- Check browser console for errors

### Publishing to Blogger failing
- Verify Blogger credentials
- Check Blog ID is correct
- Ensure OAuth token is fresh
- Check article content meets requirements

## Scaling Considerations

### For high volume (1000+ articles/day)

1. **Increase Cron Frequency**
   - Reduce fetch interval from 4h to 2h
   - Reduce dedup interval from 6h to 3h
   - Run enrich separately from publish

2. **Optimize Deduplication**
   - Lower similarity threshold
   - Increase batch size
   - Use content hash caching

3. **Database Optimization**
   - Implement table partitioning
   - Archive old articles
   - Add more indexes

4. **AI Optimization**
   - Use faster AI model
   - Batch API calls
   - Implement caching

### Database Queries
All database operations use indexes on:
- `articles(status, created_at DESC)`
- `raw_articles(feed_id, created_at DESC)`
- `deduplication_records(content_hash)`

## Security Best Practices

1. **Rotate Secrets Regularly**
   - CRON_SECRET every 3 months
   - API keys when rotated

2. **Monitor Access**
   - Check Vercel logs for errors
   - Review Supabase activity
   - Monitor OpenRouter usage

3. **Data Protection**
   - Enable Supabase backups
   - Use environment variables
   - Never commit secrets
   - Audit article content

4. **API Rate Limiting**
   - OpenRouter has rate limits
   - Monitor usage in dashboard
   - Set daily processing limits if needed

## Rollback Procedures

### Database
```sql
-- To restore from backup
-- Use Supabase dashboard to restore snapshots
```

### Code
```bash
# Revert to previous deployment
vercel rollback
```

### Configuration
- All config is in system_config table
- Easy to revert via database
- Keep backup of working config

## Cost Optimization

### Supabase
- Free tier: 500MB storage, 2GB bandwidth
- Paid: $25/month + usage
- Optimize queries to reduce bandwidth

### OpenRouter
- Pay per API call
- Use cheaper models if quality acceptable
- Cache results when possible

### Vercel
- Free tier: 100 invocations/month per function
- Pro tier: $20/month
- Cron jobs count toward invocation limit

## Support

For issues:
1. Check DEPLOYMENT_GUIDE.md and AI_NEWS_AUTOMATION_README.md
2. Review Vercel logs: `vercel logs`
3. Check Supabase dashboard for errors
4. Review application logs in browser console

## Next Steps

After deployment:
1. Test the complete workflow manually
2. Add multiple RSS feeds
3. Let cron jobs run through full cycle
4. Verify Blogger posts are being created
5. Monitor for 24 hours
6. Adjust settings based on results
7. Scale as needed
