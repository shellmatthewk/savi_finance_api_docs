# Step 16: Production Deployment

## Goal
Deploy and configure production environment for launch.

## Prerequisites
- All previous steps completed
- Security audit passed

---

## Tasks

### Task 16.1: Environment Configuration
Set up production environment variables.

```bash
# Production environment variables
# (Set in Vercel dashboard, not in code)

# Database
DATABASE_URL=postgresql://user:pass@host:5432/finflux_prod

# Redis
REDIS_URL=rediss://user:pass@host:6379

# Auth
JWT_SECRET=<generate-256-bit-secret>
NEXTAUTH_URL=https://api.finflux.io
NEXTAUTH_SECRET=<generate-secret>

# OAuth
GOOGLE_CLIENT_ID=<production-client-id>
GOOGLE_CLIENT_SECRET=<production-client-secret>

# Stripe (Live keys)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Data Providers
METALS_API_KEY=<live-key>
ALPHA_VANTAGE_KEY=<live-key>
COINGECKO_API_KEY=<live-key>

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
PAGERDUTY_KEY=<integration-key>

# Cron Secret
CRON_SECRET=<random-secret>
```

### Task 16.2: Database Setup
Configure production database.

```bash
# 1. Create production database (e.g., Neon, Supabase, RDS)

# 2. Run migrations
DATABASE_URL="<prod-url>" npm run db:push

# 3. Verify schema
DATABASE_URL="<prod-url>" npm run db:studio

# 4. Set up connection pooling (PgBouncer or similar)
```

### Task 16.3: Redis Setup
Configure production Redis.

```bash
# Options:
# - Upstash (serverless, recommended for Vercel)
# - Redis Cloud
# - AWS ElastiCache

# For Upstash:
# 1. Create database in Upstash console
# 2. Get REDIS_URL
# 3. Enable TLS (rediss://)
```

### Task 16.4: Vercel Configuration
Update `vercel.json` for production.

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"],
  "crons": [
    {
      "path": "/api/cron/ingest-eod",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/prune-rates",
      "schedule": "0 6 * * 0"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Task 16.5: Domain Configuration

```bash
# 1. Add custom domain in Vercel
#    - api.finflux.io → Production
#    - staging.finflux.io → Preview

# 2. Configure DNS
#    - A record: @ → Vercel IP
#    - CNAME: api → cname.vercel-dns.com

# 3. Enable SSL (automatic with Vercel)

# 4. Update OAuth redirect URIs
#    - Google Console: https://api.finflux.io/api/auth/google/callback
```

### Task 16.6: Monitoring Setup

```bash
# 1. Vercel Analytics (built-in)
#    - Enable in project settings

# 2. Error Tracking (Sentry)
npm install @sentry/nextjs

# sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

# 3. Uptime Monitoring
#    - Better Uptime
#    - Pingdom
#    - UptimeRobot
```

### Task 16.7: Backup Configuration

```bash
# Database Backups
# Most managed databases have automatic backups

# For Neon:
# - Automatic point-in-time recovery
# - Configure retention period

# For manual backups:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# S3 backup storage
aws s3 cp backup_*.sql s3://finflux-backups/db/
```

### Task 16.8: CDN Configuration
Set up global CDN for API responses.

```typescript
// Vercel Edge is already CDN
// For additional edge caching:

// middleware.ts - ensure proper cache headers
response.headers.set(
  'Cache-Control',
  'public, s-maxage=86400, stale-while-revalidate=3600'
);

// For Cloudflare (optional):
// 1. Add site to Cloudflare
// 2. Configure Page Rules for API caching
// 3. Set up rate limiting rules
```

### Task 16.9: Load Testing

```bash
# Install k6
brew install k6

# Create load test
# tests/load/api-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,           // Virtual users
  duration: '5m',     // Duration
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'],   // <1% failure rate
  },
};

export default function () {
  const res = http.get('https://api.finflux.io/api/v1/rates?symbol=EUR', {
    headers: { 'x-api-key': __ENV.API_KEY },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

# Run test
k6 run --env API_KEY=xxx tests/load/api-test.js
```

### Task 16.10: Legal Pages
Create required legal pages.

```typescript
// Create src/app/terms/page.tsx
// Create src/app/privacy/page.tsx

// Terms of Service - key sections:
// - API usage limits
// - Data accuracy disclaimer
// - Prohibited uses
// - Termination policy
// - Liability limitations

// Privacy Policy - key sections:
// - Data collected
// - How data is used
// - Third-party sharing
// - User rights (GDPR)
// - Data retention
// - Contact information
```

### Task 16.11: Launch Checklist

```markdown
# Pre-Launch Checklist

## Infrastructure
- [ ] Production database created and migrated
- [ ] Redis configured with TLS
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured
- [ ] SSL certificate active

## Security
- [ ] All API keys are production keys
- [ ] JWT secrets are strong and unique
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] CORS configured correctly

## Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring enabled
- [ ] Slack alerts working
- [ ] Metrics endpoint accessible

## Data
- [ ] Initial data ingestion completed
- [ ] Historical data loaded (if needed)
- [ ] Cron jobs scheduled
- [ ] Cache warming executed

## Documentation
- [ ] API docs live at /docs
- [ ] OpenAPI spec accessible
- [ ] Terms of Service published
- [ ] Privacy Policy published

## Testing
- [ ] Load test passed (1000+ RPS)
- [ ] All endpoints return correct responses
- [ ] Error handling verified
- [ ] Webhook integration tested
```

---

## Deployment Commands

```bash
# Deploy to production
vercel --prod

# Check deployment
vercel ls

# View logs
vercel logs --prod

# Roll back if needed
vercel rollback
```

---

## Post-Launch

```markdown
## First 24 Hours
- [ ] Monitor error rates
- [ ] Check cache hit ratios
- [ ] Verify data ingestion ran
- [ ] Review access logs

## First Week
- [ ] Analyze performance metrics
- [ ] Review user signups
- [ ] Check alert frequency
- [ ] Gather initial feedback

## First Month
- [ ] Review usage patterns
- [ ] Optimize slow endpoints
- [ ] Consider scaling needs
- [ ] Plan feature roadmap
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Modify | `vercel.json` |
| Create | `tests/load/api-test.js` |
| Create | `src/app/terms/page.tsx` |
| Create | `src/app/privacy/page.tsx` |
| Create | `sentry.client.config.ts` |
| Create | `sentry.server.config.ts` |

---

## Acceptance Criteria

- [ ] Production URL accessible
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Cron jobs scheduled and verified
- [ ] Monitoring and alerting active
- [ ] Load test passes (1000+ RPS target)
- [ ] Legal pages published
- [ ] SSL certificate active

---

## Congratulations!

You have completed all implementation steps. The FinFlux API is now production-ready.

### Summary of Completed Work

1. **Caching Infrastructure** - Redis + Edge caching
2. **Rate Triangulation** - Cross-currency calculations
3. **Never Fail Policy** - Stale data fallback
4. **Retry Mechanism** - Exponential backoff
5. **Graceful Degradation** - Service failover
6. **Alerting System** - Slack/PagerDuty integration
7. **Metrics Endpoint** - Prometheus-compatible
8. **Metals API** - Live precious metals data
9. **Asset Expansion** - 50+ supported symbols
10. **Security Hardening** - Auth rate limiting, headers
11. **Documentation** - OpenAPI spec, Swagger UI
12. **Production Deployment** - Full launch configuration
