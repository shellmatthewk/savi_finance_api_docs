# VaultLine MVP - Next Steps

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema | ✅ Done | Users, API keys, subscriptions, rates, usage logs |
| Auth System | ✅ Done | Register, login, logout, session management |
| API Key Management | ✅ Done | Create, list, revoke keys |
| Rate Limiting | ✅ Done | Redis-based (disabled locally) |
| Data API | ✅ Done | /api/v1/rates, /api/v1/rates/history |
| Billing Routes | ✅ Done | Stripe checkout, portal, webhooks |
| Landing Page | ✅ Done | Pricing shows Sandbox + Standard |
| Dashboard UI | ✅ Done | Overview, keys, billing pages |
| Local Dev | ✅ Done | Homebrew Postgres working |

---

## Phase 1: Production Infrastructure

### 1.1 Database (Supabase or Neon)
- [ ] Create Supabase project (or Neon database)
- [ ] Run migrations against production database
- [ ] Update `DATABASE_URL` in Vercel environment variables

### 1.2 Redis (Upstash)
- [ ] Create Upstash Redis database
- [ ] Get REST URL and token
- [ ] Add `REDIS_URL` and `REDIS_TOKEN` to environment variables

### 1.3 Stripe Setup
- [ ] Create Stripe account (if not exists)
- [ ] Create products and prices:
  - Standard Monthly: $10/month
  - Standard Yearly: $100/year (optional)
- [ ] Get API keys (use test mode first)
- [ ] Set up webhook endpoint in Stripe dashboard
- [ ] Add environment variables:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_MONTHLY`
  - `STRIPE_PRICE_ID_YEARLY`

---

## Phase 2: Deployment

### 2.1 Vercel Setup
- [ ] Connect GitHub repo to Vercel
- [ ] Configure environment variables (see `.env.example`)
- [ ] Deploy to preview environment
- [ ] Test all flows in preview

### 2.2 Domain Setup
- [ ] Purchase domain (e.g., vaultline.io)
- [ ] Configure DNS in Vercel
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Update Stripe webhook URL to production

---

## Phase 3: Real Data Integration

### 3.1 Data Provider Setup
- [ ] Choose EOD data provider (Alpha Vantage, Polygon, or similar)
- [ ] Get API credentials
- [ ] Update `src/scripts/ingest-eod.ts` with real API calls

### 3.2 Cron Jobs
- [ ] Verify Vercel cron configuration in `vercel.json`
- [ ] Test `/api/cron/ingest-eod` endpoint
- [ ] Test `/api/cron/prune-rates` endpoint
- [ ] Monitor first few runs

---

## Phase 4: Testing & QA

### 4.1 End-to-End Testing
- [ ] Register new user (Sandbox)
- [ ] Generate API key
- [ ] Make API calls, verify rate data returns
- [ ] Upgrade to Standard via Stripe checkout
- [ ] Verify plan changes and limits update
- [ ] Test Stripe customer portal (manage subscription)
- [ ] Test cancellation flow

### 4.2 Edge Cases
- [ ] Rate limit enforcement (Sandbox: 1000/day)
- [ ] History limit enforcement (Sandbox: 30 days, Standard: 90 days)
- [ ] API key limit enforcement (Sandbox: 1, Standard: 2)
- [ ] Invalid API key handling
- [ ] Expired session handling

---

## Phase 5: Polish & Launch

### 5.1 UI Improvements
- [ ] Add loading states throughout
- [ ] Add error toasts/notifications
- [ ] Mobile responsiveness check
- [ ] Add favicon and meta tags

### 5.2 Documentation
- [ ] API documentation page (or external docs)
- [ ] Getting started guide
- [ ] Terms of service
- [ ] Privacy policy

### 5.3 Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Configure Stripe webhook alerts

---

## Environment Variables Checklist

```bash
# Database
DATABASE_URL=

# Redis (Upstash)
REDIS_URL=
REDIS_TOKEN=

# JWT
JWT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Sample API Usage

### Python

```python
import requests

API_KEY = "vl_your_api_key_here"
BASE_URL = "http://localhost:3000"  # Change to production URL

# Get current rates
response = requests.get(
    f"{BASE_URL}/api/v1/rates?symbols=EUR/USD,GBP/USD,BTC/USD",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
print(response.json())

# Get historical rates (last 30 days)
response = requests.get(
    f"{BASE_URL}/api/v1/rates/history?symbol=EUR/USD&days=30",
    headers={"Authorization": f"Bearer {API_KEY}"}
)
print(response.json())
```

### JavaScript / Node.js

```javascript
const API_KEY = "vl_your_api_key_here";
const BASE_URL = "http://localhost:3000"; // Change to production URL

// Get current rates
const response = await fetch(
  `${BASE_URL}/api/v1/rates?symbols=EUR/USD,GBP/USD,BTC/USD`,
  { headers: { "Authorization": `Bearer ${API_KEY}` } }
);
const data = await response.json();
console.log(data);

// Get historical rates
const historyResponse = await fetch(
  `${BASE_URL}/api/v1/rates/history?symbol=EUR/USD&days=30`,
  { headers: { "Authorization": `Bearer ${API_KEY}` } }
);
const historyData = await historyResponse.json();
console.log(historyData);
```

### cURL

```bash
# Get current rates
curl "http://localhost:3000/api/v1/rates?symbols=EUR/USD,GBP/USD,BTC/USD" \
  -H "Authorization: Bearer vl_your_api_key_here"

# Get historical rates
curl "http://localhost:3000/api/v1/rates/history?symbol=EUR/USD&days=30" \
  -H "Authorization: Bearer vl_your_api_key_here"
```

### Response Format

**Current Rates:**
```json
{
  "data": [
    {
      "symbol": "EUR/USD",
      "rate": "1.08450000",
      "base_currency": "USD",
      "asset_class": "currency",
      "date": "2026-02-27",
      "delayed_by": "24h"
    }
  ]
}
```

**Historical Rates:**
```json
{
  "symbol": "EUR/USD",
  "base_currency": "USD",
  "asset_class": "currency",
  "from": "2026-01-28",
  "to": "2026-02-27",
  "history": [
    { "date": "2026-02-27", "rate": "1.08450000" },
    { "date": "2026-02-26", "rate": "1.08320000" }
  ],
  "delayed_by": "24h"
}
```

---

## Quick Commands

```bash
# Run locally
npm run dev

# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data
npx tsx src/db/seed.ts

# Run data ingestion manually
npx tsx src/scripts/ingest-eod.ts
```
