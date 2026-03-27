# Final Steps: Comprehensive EOD Data Coverage

## Overview

Complete the VaultLine API with comprehensive End-of-Day (EOD) financial data coverage using **free-tier APIs only**.

**Target:** 500+ symbols across all asset classes at $0/month operational cost.

---

## 1. Data Providers (All Free Tier)

### Fiat Currencies

| Provider | Free Tier | Coverage | API Key Required |
|----------|-----------|----------|------------------|
| **Frankfurter** | Unlimited | 33 currencies | No |
| **ExchangeRate.host** | Unlimited | 200+ currencies | No |
| **FreeCurrencyAPI** | 5,000/month | 150+ currencies | Yes (free) |

**Recommendation:** Use Frankfurter (European Central Bank data) as primary, ExchangeRate.host as fallback.

**Symbols (33 major):**
```
USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD, CNY, HKD,
SGD, SEK, NOK, DKK, MXN, BRL, INR, KRW, THB, IDR,
MYR, PHP, PLN, CZK, HUF, TRY, ZAR, RUB, ILS, AED,
SAR, TWD, BGN
```

### Cryptocurrencies

| Provider | Free Tier | Coverage | API Key Required |
|----------|-----------|----------|------------------|
| **CoinGecko** | 10-30 calls/min | 10,000+ coins | No (optional key for higher limits) |
| **CoinCap** | Unlimited | 2,000+ coins | No |

**Recommendation:** CoinGecko primary (best data), CoinCap fallback.

**Symbols (Top 50 by market cap):**
```
BTC, ETH, USDT, BNB, SOL, XRP, USDC, DOGE, ADA, STETH,
AVAX, TRX, LINK, TON, SUI, SHIB, XLM, DOT, HBAR, BCH,
LEO, UNI, LTC, PEPE, NEAR, APT, DAI, ICP, ETC, RNDR,
POL, CRO, VET, FET, ALGO, KAS, ATOM, FIL, ARB, STX,
OP, MKR, IMX, INJ, TAO, GRT, XMR, THETA, BONK, FTM
```

### Stocks

| Provider | Free Tier | Coverage | API Key Required |
|----------|-----------|----------|------------------|
| **Financial Modeling Prep** | 250 calls/day | US stocks | Yes (free) |
| **Alpha Vantage** | 25 calls/day | Global | Yes (free) |
| **Yahoo Finance (yfinance)** | Unlimited* | Global | No |

*Yahoo Finance is unofficial/scraping - may break.

**Recommendation:** Financial Modeling Prep primary (250 calls = 250 stocks/day is plenty for EOD).

**Symbols (Top 100 US stocks):**
```
AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, BRK.B, JPM, V,
JNJ, WMT, PG, MA, UNH, HD, DIS, BAC, XOM, PFE,
KO, PEP, CSCO, ABBV, CVX, MRK, COST, TMO, ABT, NKE,
ORCL, ACN, MCD, LLY, ADBE, CRM, AMD, QCOM, TXN, INTC,
NFLX, CMCSA, VZ, T, PM, HON, UPS, IBM, GE, CAT,
BA, RTX, GS, MS, BLK, SCHW, AXP, C, SPGI, MMM,
LMT, DE, LOW, NOW, PYPL, ISRG, BKNG, MDLZ, GILD, AMGN,
SYK, ADP, ADI, VRTX, REGN, ZTS, MMC, CB, CI, PLD,
BDX, SO, DUK, CL, ITW, SHW, APD, NSC, FDX, EMR,
ECL, CTAS, WELL, TGT, KLAC, HUM, PSA, AEP, AFL, ALL
```

### Metals & Commodities

| Provider | Free Tier | Coverage | API Key Required |
|----------|-----------|----------|------------------|
| **Metals.live** | Unlimited | Precious metals | No |
| **GoldAPI** | 100 calls/month | Gold, Silver | Yes (free) |

**Recommendation:** Metals.live primary (free, no key needed).

**Symbols (10):**
```
XAU (Gold), XAG (Silver), XPT (Platinum), XPD (Palladium),
XCU (Copper), XAL (Aluminum), XPB (Lead), XNI (Nickel),
XZN (Zinc), XSN (Tin)
```

Note: Industrial metals (copper, aluminum, etc.) may require LME data which is expensive. Start with precious metals only, expand later.

---

## 2. Environment Variables

Add to `.env.local` and Vercel:

```bash
# Fiat (no keys needed for Frankfurter/ExchangeRate.host)
# Optional: FreeCurrencyAPI for more currencies
FREECURRENCY_API_KEY=

# Crypto (optional - for higher CoinGecko rate limits)
COINGECKO_API_KEY=

# Stocks (required)
FINANCIAL_DATA_API_KEY=           # financialmodelingprep.com - FREE signup
ALPHAVANTAGE_API_KEY=             # alphavantage.co - FREE signup

# Metals (optional fallback)
GOLDAPI_KEY=                      # goldapi.io - FREE tier 100 calls/month

# Cron Security
CRON_SECRET=                      # Random string for Vercel cron auth

# Alerts (optional)
SLACK_WEBHOOK_URL=                # For ingestion failure alerts
```

---

## 3. Implementation Tasks

### Task 1: Create Provider Modules

Create individual provider files with retry + fallback logic:

```
src/lib/providers/
├── fiat.ts          # Frankfurter + ExchangeRate.host
├── crypto.ts        # CoinGecko + CoinCap
├── stocks.ts        # FMP + Alpha Vantage
└── metals.ts        # Already exists - expand symbols
```

### Task 2: Expand Symbol Lists

Update `src/app/api/cron/ingest-eod/route.ts`:

- [ ] Fiat: 10 → 33 currencies
- [ ] Crypto: 5 → 50 coins
- [ ] Stocks: 5 → 100 tickers
- [ ] Metals: 4 → 6 (precious only for free tier)

### Task 3: Split Cron Jobs (Optional)

For better reliability, split into separate endpoints:

```
/api/cron/ingest-fiat        # 33 symbols, fast
/api/cron/ingest-crypto      # 50 symbols, fast
/api/cron/ingest-stocks      # 100 symbols, may need batching
/api/cron/ingest-metals      # 6 symbols, fast
```

### Task 4: Update Vercel Cron Config

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-eod",
      "schedule": "0 22 * * *"
    },
    {
      "path": "/api/cron/prune-rates",
      "schedule": "0 6 * * 0"
    }
  ]
}
```

Single daily job at 10 PM UTC (after US market close, captures all EOD data).

### Task 5: Update Assets Endpoint

Ensure `/api/v1/assets` returns all new symbols grouped by asset class.

### Task 6: Seed Historical Data (Optional)

For new symbols, backfill 30-90 days of historical data on first deploy.

---

## 4. API Signup Links (All Free)

| Provider | Signup URL | Free Tier |
|----------|------------|-----------|
| Financial Modeling Prep | https://financialmodelingprep.com/developer/docs/ | 250 calls/day |
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | 25 calls/day |
| CoinGecko | https://www.coingecko.com/en/api | No key needed |
| GoldAPI | https://www.goldapi.io/dashboard | 100 calls/month |
| FreeCurrencyAPI | https://freecurrencyapi.com/ | 5000 calls/month |

---

## 5. Final Symbol Count

| Asset Class | Count | Source |
|-------------|-------|--------|
| Fiat | 33 | Frankfurter (ECB) |
| Crypto | 50 | CoinGecko |
| Stocks | 100 | Financial Modeling Prep |
| Metals | 6 | Metals.live |
| **Total** | **189** | |

With triangulation, this enables **35,000+ cross-pairs** (189 × 188 = 35,532 combinations).

---

## 6. Cost Summary

| Item | Monthly Cost |
|------|--------------|
| Frankfurter API | $0 |
| CoinGecko API | $0 |
| Financial Modeling Prep | $0 |
| Metals.live | $0 |
| Vercel Hosting | $0 (Hobby) / $20 (Pro for crons) |
| Upstash Redis | $0 (Free tier: 10k commands/day) |
| Neon PostgreSQL | $0 (Free tier: 0.5GB) |
| **Total** | **$0 - $20/month** |

Note: Vercel Hobby plan has cron limitations. Pro plan ($20/month) recommended for production crons.

---

## 7. Testing Checklist

- [ ] All provider API keys configured in Vercel
- [ ] Cron job triggers successfully
- [ ] All 189 symbols ingest without errors
- [ ] Cache invalidation works after ingestion
- [ ] `/api/v1/rates?symbols=BTC,EUR,AAPL,XAU` returns data
- [ ] `/api/v1/assets` lists all symbols
- [ ] Triangulation works for cross-pairs (e.g., `EUR/JPY`)
- [ ] Rate limiting enforced per plan tier
- [ ] Error alerts sent on provider failures

---

## 8. Future Expansion (Paid Tiers)

When revenue justifies it:

| Upgrade | Cost | Benefit |
|---------|------|---------|
| Twelve Data Basic | $29/mo | 800 calls/day, more stocks |
| CoinGecko Pro | $129/mo | Higher rate limits, more endpoints |
| Polygon.io Starter | $29/mo | Real-time US stocks |
| LME Data | $500+/mo | Industrial metals (copper, zinc, etc.) |

---

## Next Actions

1. Sign up for free API keys (FMP, Alpha Vantage)
2. Add keys to Vercel environment variables
3. Implement expanded provider modules
4. Update symbol lists in ingestion code
5. Test cron job manually
6. Deploy and monitor first automated run
