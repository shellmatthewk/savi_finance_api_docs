# VaultLine

**One API for every financial rate on Earth.**

VaultLine is a unified financial data API that provides end-of-day (EOD) exchange rates for fiat currencies, cryptocurrencies, stocks, and precious metals through a single, normalized interface. Two-tier pricing: free Sandbox and $10/month Standard.

---

## Current Status

### What's Live

**Data Layer**
- PostgreSQL database with 5 tables (users, api_keys, subscriptions, usage_logs, rates)
- Daily EOD ingestion from free-tier providers (Exchange Rates API, CoinGecko, Financial Modeling Prep)
- ~32 symbols covered: 10 fiat pairs, 7 crypto, 10 stocks, 4 metals
- Automated cron: ingest at 6 AM UTC daily, prune data older than 90 days weekly

**Backend API**
- 3 data endpoints: `/api/v1/rates`, `/api/v1/rates/history`, `/api/v1/assets`
- Auth: register, login, logout, session check (custom JWT with httpOnly cookies)
- API key management: create, list, revoke (plan-enforced limits)
- Stripe billing: checkout, subscription status, customer portal, webhooks
- Redis-backed rate limiting: 1,000/day for Sandbox, unlimited for Standard
- Usage logging and daily usage endpoint

**Frontend**
- Marketing landing page with 2-tier pricing (Sandbox + Standard)
- Auth pages: register (with one-time API key reveal), login
- Dashboard: plan status, usage progress bar, API key count
- API key management: generate, list, revoke with confirmation
- Billing: upgrade to Standard via Stripe, manage subscription via Stripe Portal
- Responsive sidebar layout with session guard

**Infrastructure**
- GitHub Actions CI (lint + build + typecheck)
- Vercel cron scheduling for data ingestion and pruning
- Upstash Redis for rate limiting

### What's Not Built Yet

- API documentation page
- Redis caching for API responses (currently only used for rate limiting)
- Edge caching (Cloudflare Workers)
- Rate triangulation (cross-pair calculations like CAD/XAU from USD base rates)
- Expanded asset coverage (PRD targets 5,430+ symbols)
- Batch endpoint, conversion endpoint, webhook alerts
- Tests

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache | Upstash Redis (serverless) |
| Auth | Custom JWT (jose, bcryptjs, httpOnly cookies) |
| Billing | Stripe (Checkout, Webhooks, Customer Portal) |
| Styling | Tailwind CSS v4, Lucide React, Framer Motion |
| Fonts | Geist Sans + Geist Mono |
| Deployment | Vercel |

---

## API Endpoints

### Data API (requires `Authorization: Bearer vl_<key>`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/rates?symbols=BTC/USD,EUR/USD` | Latest EOD rates (max 50 symbols) |
| GET | `/api/v1/rates/history?symbol=BTC/USD&start=2024-01-01&end=2024-01-31` | Historical daily rates |
| GET | `/api/v1/assets` | List all supported symbols by asset class |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account (auto-generates API key + session) |
| POST | `/api/auth/login` | Login (sets session cookie) |
| POST | `/api/auth/logout` | Logout (clears session) |
| GET | `/api/auth/me` | Current user info + subscription status |

### API Keys (requires session)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/keys` | List active keys |
| POST | `/api/keys` | Generate new key (plan limit enforced) |
| DELETE | `/api/keys/:id` | Revoke a key |

### Billing (requires session)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/billing/checkout` | Create Stripe Checkout session |
| GET | `/api/billing/subscription` | Get subscription status |
| POST | `/api/billing/portal` | Get Stripe Customer Portal link |

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/usage/today` | Today's API call count (for dashboard) |
| GET | `/api/health` | Health check (DB + Redis ping) |

---

## Quick Start (Client Libraries)

### Python

```bash
pip install requests
```

```python
from vaultline import VaultLine

client = VaultLine('vl_your_api_key')

# Get current rates
rates = client.get_rates(['BTC/USD', 'ETH/USD', 'AAPL'])
for rate in rates['data']:
    print(f"{rate['symbol']}: {rate['rate']}")

# Get historical data
history = client.get_history('BTC/USD', '2024-01-01', '2024-01-31')
print(f"{len(history['history'])} data points")

# Check rate limit
print(f"API calls remaining: {client.rate_limit.remaining}")
```

### JavaScript / Node.js

```javascript
const VaultLine = require('./vaultline');

const client = new VaultLine('vl_your_api_key');

// Get current rates
const { data: rates } = await client.getRates(['BTC/USD', 'ETH/USD']);
console.log(rates);

// Get historical data
const { data: history } = await client.getHistory('BTC/USD', '2024-01-01', '2024-01-31');
console.log(history.history.length, 'data points');
```

### cURL

```bash
# Get rates
curl -H "Authorization: Bearer vl_your_api_key" \
  "https://api.vaultline.io/api/v1/rates?symbols=BTC/USD,ETH/USD"

# Get history
curl -H "Authorization: Bearer vl_your_api_key" \
  "https://api.vaultline.io/api/v1/rates/history?symbol=BTC/USD&from=2024-01-01&to=2024-01-31"
```

See [`examples/`](./examples/) for full client implementations.

---

## Plans

| | Sandbox | Standard |
|---|---|---|
| Price | Free | $10/month ($96/year) |
| API calls | 1,000/day | Unlimited |
| Data | EOD (24hr delayed) | EOD (24hr delayed) |
| History | 30 days | 90 days |
| API keys | 1 | 2 |
| Trial | - | 7-day free trial |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Upstash Redis instance
- Stripe account (test mode)

### Setup

```bash
# Clone
git clone https://github.com/AHussain101/savi_finance_api.git
cd savi_finance_api

# Install
npm install

# Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, REDIS_URL, REDIS_TOKEN, STRIPE keys, JWT_SECRET

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Ingest EOD data from providers
npm run data:ingest

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database |
| `npm run data:ingest` | Fetch EOD data from providers |
| `npm run data:prune` | Remove data older than 90 days |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # register, login, logout, me
│   │   ├── billing/        # checkout, subscription, portal
│   │   ├── keys/           # API key CRUD
│   │   ├── usage/          # Daily usage stats
│   │   ├── health/         # Health check
│   │   ├── webhooks/       # Stripe webhook handler
│   │   ├── cron/           # Vercel cron jobs (ingest, prune)
│   │   └── v1/             # Data API (rates, history, assets)
│   ├── auth/               # Login + register pages
│   ├── dashboard/          # Dashboard, keys, billing pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Tailwind theme + animations
├── components/
│   ├── ui/                 # Button, Input, Card, Badge, Modal, Spinner
│   └── *.tsx               # Landing page sections
├── contexts/
│   └── AuthContext.tsx      # Client-side auth state
├── db/
│   ├── schema.ts           # Drizzle table definitions
│   ├── client.ts           # DB connection
│   ├── queries/            # Query functions per table
│   └── migrations/         # SQL migration files
├── lib/
│   ├── auth.ts             # JWT sign/verify, session cookies
│   ├── authenticateApiKey.ts # API key validation middleware
│   ├── rateLimit.ts        # Redis rate limiting
│   ├── redis.ts            # Upstash Redis client
│   └── stripe.ts           # Stripe client
└── scripts/
    ├── ingest-eod.ts       # EOD data fetcher
    └── prune-rates.ts      # Data retention cleanup
```

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Upstash Redis REST URL |
| `REDIS_TOKEN` | Yes | Upstash Redis auth token |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `JWT_SECRET` | Yes | Secret for signing session JWTs |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (no trailing slash) |
| `FINANCIAL_DATA_API_KEY` | No | Premium data provider key |
