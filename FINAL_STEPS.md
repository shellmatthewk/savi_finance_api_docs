# Final Steps: 775 Symbol EOD Data Coverage

## Target Coverage

| Asset Class | Count | Examples |
|-------------|-------|----------|
| Fiat | 50 | USD, EUR, GBP, JPY, CNY, INR, BRL, MXN, KRW, etc. |
| Crypto | 100 | BTC, ETH, BNB, XRP, SOL, ADA, DOGE, SHIB, etc. |
| US Stocks | 500 | S&P 500 components |
| Intl Stocks | 100 | Major EU/Asia tickers |
| Metals | 10 | XAU, XAG, XPT, XPD, copper, aluminum |
| Energy | 5 | Crude oil, natural gas, gasoline |
| Agriculture | 10 | Wheat, corn, soybeans, coffee, sugar |
| **Total** | **775** | |

---

## API Strategy (All Free, Bulk Fetch)

### 1. Fiat Currencies (50 symbols) - 1 API Call

**Provider:** Frankfurter API (European Central Bank data)
- **URL:** `https://api.frankfurter.app/latest`
- **Cost:** Free, unlimited
- **Bulk:** Returns ALL currencies in 1 call
- **No API key required**

```bash
# Returns 30+ currencies in one call
curl https://api.frankfurter.app/latest?from=USD
```

**Fallback:** ExchangeRate.host
```bash
curl "https://api.exchangerate.host/latest?base=USD"
```

---

### 2. Cryptocurrencies (100 symbols) - 1 API Call

**Provider:** CoinGecko
- **URL:** `https://api.coingecko.com/api/v3/simple/price`
- **Cost:** Free (30 calls/min)
- **Bulk:** Up to 250 coins per call
- **No API key required** (optional for higher limits)

```bash
# Fetch 100 coins in ONE call
curl "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,...&vs_currencies=usd"
```

**CoinGecko IDs for Top 100:**
```
bitcoin,ethereum,tether,binancecoin,solana,ripple,usd-coin,dogecoin,cardano,
staked-ether,avalanche-2,tron,chainlink,the-open-network,sui,shiba-inu,stellar,
polkadot,hedera-hashgraph,bitcoin-cash,leo-token,uniswap,litecoin,pepe,near,
aptos,dai,internet-computer,ethereum-classic,render-token,polygon-ecosystem-token,
crypto-com-chain,vechain,fetch-ai,algorand,kaspa,cosmos,filecoin,arbitrum,stacks,
optimism,maker,immutable-x,injective-protocol,bittensor,the-graph,monero,theta-token,
bonk,fantom,mantra,celestia,sei-network,okb,floki,arweave,flow,aave,gala,axie-infinity,
thorchain,kucoin-shares,neo,eos,beam,raydium,helium,tezos,lido-dao,quant-network,
chiliz,bittorrent,decentraland,zcash,pancakeswap-token,dash,iota,synthetix-network-token,
kava,compound-governance-token,curve-dao-token,basic-attention-token,zilliqa,1inch,
enjincoin,yearn-finance,qtum,ravencoin,holo,celo,harmony,theta-fuel,waves,loopring,
mina-protocol,nexo,kusama,gnosis,woo-network,ocean-protocol
```

---

### 3. US Stocks - S&P 500 (500 symbols) - 2 API Calls

**Provider:** Financial Modeling Prep (FMP)
- **URL:** `https://financialmodelingprep.com/api/v3/quote/`
- **Cost:** Free (250 calls/day)
- **Bulk:** Multiple symbols per call (comma-separated)
- **API Key:** Required (free signup)

```bash
# Batch 1: First 250 stocks
curl "https://financialmodelingprep.com/api/v3/quote/AAPL,MSFT,GOOGL,...?apikey=YOUR_KEY"

# Batch 2: Next 250 stocks
curl "https://financialmodelingprep.com/api/v3/quote/NFLX,CRM,ADBE,...?apikey=YOUR_KEY"
```

**S&P 500 Full List:** See `src/data/sp500.ts` (to be created)

**Alternative Free Option:** Yahoo Finance (unofficial)
```bash
curl "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,MSFT,GOOGL"
```

---

### 4. International Stocks (100 symbols) - 1 API Call

**Provider:** Financial Modeling Prep
- Same API, just different symbols
- EU tickers: Use suffix (e.g., `BMW.DE`, `LVMH.PA`)
- Asia tickers: (e.g., `7203.T` Toyota, `9988.HK` Alibaba)

```bash
curl "https://financialmodelingprep.com/api/v3/quote/BMW.DE,SAP.DE,LVMH.PA,MC.PA,7203.T,...?apikey=YOUR_KEY"
```

---

### 5. Precious Metals (10 symbols) - 1 API Call

**Provider:** Metals.live
- **URL:** `https://api.metals.live/v1/spot/`
- **Cost:** Free
- **Bulk:** All metals in 1 call
- **No API key required**

```bash
curl "https://api.metals.live/v1/spot/gold,silver,platinum,palladium,rhodium,copper,aluminum,zinc,nickel,lead"
```

**Symbols:**
```
XAU (Gold), XAG (Silver), XPT (Platinum), XPD (Palladium), XRH (Rhodium),
XCU (Copper), XAL (Aluminum), XZN (Zinc), XNI (Nickel), XPB (Lead)
```

---

### 6. Energy Commodities (5 symbols) - 1 API Call

**Provider:** Alpha Vantage Commodities
- **URL:** `https://www.alphavantage.co/query?function=`
- **Cost:** Free (25 calls/day)
- **API Key:** Required (free signup)

```bash
# WTI Crude Oil
curl "https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=YOUR_KEY"

# Brent Crude
curl "https://www.alphavantage.co/query?function=BRENT&interval=daily&apikey=YOUR_KEY"

# Natural Gas
curl "https://www.alphavantage.co/query?function=NATURAL_GAS&interval=daily&apikey=YOUR_KEY"
```

**Symbols:**
```
WTI (Crude Oil), BRENT (Brent Crude), NG (Natural Gas),
RBOB (Gasoline), HO (Heating Oil)
```

---

### 7. Agriculture Commodities (10 symbols) - 1 API Call

**Provider:** Alpha Vantage Commodities
- Same API as energy

```bash
# Wheat
curl "https://www.alphavantage.co/query?function=WHEAT&interval=daily&apikey=YOUR_KEY"

# Corn
curl "https://www.alphavantage.co/query?function=CORN&interval=daily&apikey=YOUR_KEY"
```

**Symbols:**
```
WHEAT, CORN, SOYBEANS (via proxy), COFFEE, SUGAR,
COTTON, COCOA, RICE, OATS, LUMBER
```

**Note:** Alpha Vantage has limited commodity coverage. Alternative: Use ETF prices as proxies:
- `DBA` (Agriculture ETF)
- `CORN` (Corn ETF)
- `WEAT` (Wheat ETF)
- `SOYB` (Soybean ETF)
- `JO` (Coffee ETF)
- `CANE` (Sugar ETF)

---

## API Calls Summary

| Asset Class | Symbols | API Calls | Provider |
|-------------|---------|-----------|----------|
| Fiat | 50 | 1 | Frankfurter |
| Crypto | 100 | 1 | CoinGecko |
| US Stocks | 500 | 2 | FMP (batched) |
| Intl Stocks | 100 | 1 | FMP |
| Metals | 10 | 1 | Metals.live |
| Energy | 5 | 5 | Alpha Vantage |
| Agriculture | 10 | 10 | Alpha Vantage (or ETF proxies) |
| **Total** | **775** | **~21** | |

---

## Environment Variables

```bash
# Required
FINANCIAL_DATA_API_KEY=           # financialmodelingprep.com (free)
ALPHAVANTAGE_API_KEY=             # alphavantage.co (free)

# Optional (fallbacks)
COINGECKO_API_KEY=                # Higher rate limits
GOLDAPI_KEY=                      # Metals fallback

# Cron
CRON_SECRET=                      # Vercel cron auth
```

---

## Implementation Plan

### Task 1: Create Symbol Data Files

```
src/data/
├── fiat-symbols.ts       # 50 currencies
├── crypto-coins.ts       # 100 CoinGecko IDs + symbol mapping
├── sp500-symbols.ts      # 500 S&P 500 tickers
├── intl-stocks.ts        # 100 international tickers
├── metals-symbols.ts     # 10 metal symbols
├── energy-symbols.ts     # 5 energy commodities
└── agriculture-symbols.ts # 10 agriculture commodities
```

### Task 2: Create Provider Modules

```
src/lib/providers/
├── fiat.ts          # Frankfurter + fallback
├── crypto.ts        # CoinGecko bulk fetch
├── stocks.ts        # FMP bulk fetch with batching
├── metals.ts        # Already exists - expand
├── energy.ts        # Alpha Vantage commodities
└── agriculture.ts   # Alpha Vantage + ETF proxies
```

### Task 3: Update Ingestion Cron

Modify `src/app/api/cron/ingest-eod/route.ts`:
- Import all provider modules
- Fetch all 775 symbols in parallel
- Batch insert into database

### Task 4: Update Assets Endpoint

Ensure `/api/v1/assets` returns all 775 symbols grouped correctly.

---

## Database Considerations

**Daily Records:** 775 symbols × 1 record/day = 775 records/day

**Monthly Storage:** 775 × 30 = 23,250 records/month

**Yearly Storage:** 775 × 365 = 283,000 records/year

**Neon Free Tier:** 0.5GB = ~5 million records (plenty of room)

---

## Cron Schedule

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest-eod",
      "schedule": "0 22 * * 1-5"
    },
    {
      "path": "/api/cron/prune-rates",
      "schedule": "0 6 * * 0"
    }
  ]
}
```

**10 PM UTC** = 5 PM EST (after US market close, captures all EOD)

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Frankfurter API | Free | $0 |
| CoinGecko | Free | $0 |
| Financial Modeling Prep | Free | $0 |
| Alpha Vantage | Free | $0 |
| Metals.live | Free | $0 |
| Vercel | Hobby/Pro | $0-20 |
| Upstash Redis | Free | $0 |
| Neon PostgreSQL | Free | $0 |
| **Total** | | **$0-20/mo** |

---

## Free API Signup Links

1. **Financial Modeling Prep:** https://site.financialmodelingprep.com/developer/docs
2. **Alpha Vantage:** https://www.alphavantage.co/support/#api-key
3. **CoinGecko:** No signup needed (optional: https://www.coingecko.com/en/api)

---

## Testing Checklist

- [ ] Get FMP API key and add to Vercel env
- [ ] Get Alpha Vantage API key and add to Vercel env
- [ ] Create symbol data files
- [ ] Implement provider modules
- [ ] Test bulk fetch locally
- [ ] Update ingestion cron
- [ ] Deploy and trigger manual cron run
- [ ] Verify 775 symbols in database
- [ ] Test `/api/v1/rates?symbols=BTC,EUR,AAPL,XAU,WTI,WHEAT`
- [ ] Test `/api/v1/assets` returns all categories
- [ ] Monitor first automated run

---

## Next Steps

1. Sign up for free API keys (FMP, Alpha Vantage)
2. Run implementation with `pragmatic-engineer` agent
3. Test full ingestion
4. Deploy to production
