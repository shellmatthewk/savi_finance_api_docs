# VaultLine

**One API for every financial rate on Earth.**

VaultLine is a unified financial data API providing real-time and historical exchange rates for fiat currencies, cryptocurrencies, stocks, and precious metals through a single, normalized interface.

## Features

- **Unified API** - Single endpoint for fiat, crypto, stocks, and metals
- **64 Symbols** - 17 fiat currencies, 20 cryptocurrencies, 17 stocks, 10 precious metals
- **Cross-Rate Triangulation** - Any currency pair calculated on-the-fly (29M+ combinations)
- **Three-Layer Caching** - Edge, Redis, and database caching for <100ms responses
- **Circuit Breakers** - Graceful degradation with stale data fallback
- **99.9% Uptime** - Dual-provider resilience for every asset class

## Quick Start

```bash
# Get current rates
curl -H "x-api-key: vl_your_api_key" \
  "https://api.vaultline.io/api/v1/rates?symbols=BTC,EUR,AAPL,XAU"

# Get a cross-rate (triangulated)
curl -H "x-api-key: vl_your_api_key" \
  "https://api.vaultline.io/api/v1/rates?symbol=EUR/JPY"

# Get historical data
curl -H "x-api-key: vl_your_api_key" \
  "https://api.vaultline.io/api/v1/rates/history?symbol=BTC&from=2024-01-01&to=2024-01-31"
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/rates` | Current rates for one or more symbols |
| `GET /api/v1/rates/history` | Historical rates for a date range |
| `GET /api/v1/assets` | List all supported symbols by asset class |

Full API documentation: [/docs](https://api.vaultline.io/docs)

Interactive API explorer: [/docs/swagger](https://api.vaultline.io/docs/swagger)

## Response Example

```json
{
  "data": [
    {
      "symbol": "BTC",
      "rate": "67234.50",
      "base_currency": "USD",
      "asset_class": "crypto",
      "date": "2024-03-15"
    }
  ],
  "meta": {
    "cache": "HIT",
    "timestamp": "2024-03-15T14:30:00Z"
  }
}
```

## Plans

| Feature | Sandbox | Standard | Enterprise |
|---------|---------|----------|------------|
| Price | Free | $10/month | Contact us |
| API calls | 100/day | 10,000/day | Unlimited |
| History | 30 days | 365 days | Unlimited |
| Support | Community | Email | Dedicated |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Cache | Upstash Redis |
| Auth | Custom JWT + bcrypt |
| Billing | Stripe |
| Deployment | Vercel |
| Monitoring | Sentry + Prometheus |

## Architecture

```
Request Flow:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│ Edge Cache  │────▶│ Redis Cache │
└─────────────┘     │ (Vercel)    │     │ (Upstash)   │
                    └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │    API      │────▶│  PostgreSQL │
                    │  (Next.js)  │     │  (Neon)     │
                    └─────────────┘     └─────────────┘
```

**Cache Strategy:**
- Edge cache: 85%+ hit rate, TTL varies by plan tier
- Redis cache: 5-minute TTL, full rate objects
- Database: Source of truth, written by ingestion only

**Resilience:**
- Circuit breakers for database and Redis
- Stale data fallback when services degrade
- Dual-provider ingestion for all asset classes
- Automatic retry with exponential backoff

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Upstash Redis instance
- Stripe account (test mode)

### Setup

```bash
# Clone
git clone https://github.com/your-repo/savi_finance_api.git
cd savi_finance_api

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, REDIS_URL, STRIPE keys, etc.

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Start dev server
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema changes (dev) |
| `npm run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Authentication endpoints
│   │   ├── admin/          # Admin endpoints (cache, metrics)
│   │   ├── cron/           # Scheduled jobs (ingestion)
│   │   └── v1/             # Public API (rates, assets)
│   ├── dashboard/          # User dashboard
│   ├── docs/               # API documentation
│   └── page.tsx            # Landing page
├── lib/
│   ├── auth.ts             # JWT & session handling
│   ├── cache.ts            # Redis caching layer
│   ├── triangulation.ts    # Cross-rate calculations
│   ├── resilientData.ts    # Circuit breakers
│   ├── retry.ts            # Retry with backoff
│   └── providers/          # Data provider integrations
└── db/
    ├── schema.ts           # Database schema
    └── queries/            # Query functions
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Upstash Redis REST URL |
| `REDIS_TOKEN` | Yes | Upstash Redis auth token |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `JWT_SECRET` | Yes | Session JWT signing secret |
| `ADMIN_TOKEN` | Yes | Admin API authentication |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

## Client Libraries

### JavaScript

```javascript
const VaultLine = require('./vaultline');

const client = new VaultLine('vl_your_api_key');

// Get current rates
const { data: rates } = await client.getRates(['BTC', 'ETH', 'EUR']);
console.log(rates.data);

// Get historical data
const { data: history } = await client.getHistory('BTC', '2024-01-01', '2024-01-31');
console.log(history.history.length, 'data points');
```

### Python

```python
from vaultline import VaultLine

client = VaultLine('vl_your_api_key')

# Get current rates
rates = client.get_rates(['BTC', 'ETH', 'EUR'])
for rate in rates['data']:
    print(f"{rate['symbol']}: {rate['rate']}")

# Get historical data
history = client.get_history('BTC', '2024-01-01', '2024-01-31')
print(f"{len(history['history'])} data points")
```

See [`examples/`](./examples/) for complete client implementations.

## Supported Assets

**Fiat (17):** USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD, SGD, SEK, NOK, DKK, MXN, BRL, INR

**Crypto (20):** BTC, ETH, USDT, BNB, SOL, XRP, USDC, ADA, AVAX, DOGE, DOT, TRX, LINK, MATIC, TON, SHIB, LTC, BCH, XLM, UNI

**Stocks (17):** AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V, JNJ, WMT, PG, MA, UNH, HD, DIS

**Metals (10):** XAU, XAG, XPT, XPD, XRH, XCU, XAL, XPB, XNI, XZN

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Links

- [API Documentation](https://api.vaultline.io/docs)
- [Interactive API Explorer](https://api.vaultline.io/docs/swagger)
- [Status Page](https://status.vaultline.io)
