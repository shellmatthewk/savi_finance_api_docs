# Step 12: Real Metals API Integration

## Goal
Replace hardcoded metals data with a real API provider.

## Prerequisites
- Step 07 completed (retry mechanism)

---

## Provider Evaluation

| Provider | Free Tier | Paid | Notes |
|----------|-----------|------|-------|
| Metals-API | 100 req/mo | $15/mo | XAU, XAG, XPT, XPD |
| GoldAPI.io | 100 req/mo | $9/mo | Gold/Silver focus |
| MetalPriceAPI | 100 req/mo | $12/mo | Comprehensive metals |

**Recommendation:** Metals-API for best coverage at reasonable cost.

---

## Tasks

### Task 12.1: Create Metals Fetcher
Create `src/lib/providers/metals.ts`.

```typescript
// src/lib/providers/metals.ts
import { withIngestionRetry } from '../retry';
import { recordProviderSuccess, recordProviderFailure } from '../providerHealth';

const METALS_API_KEY = process.env.METALS_API_KEY;
const METALS_API_URL = 'https://metals-api.com/api';

export interface MetalRate {
  symbol: string;
  rate: number;
  unit: string; // 'oz' for troy ounce
}

const SUPPORTED_METALS = ['XAU', 'XAG', 'XPT', 'XPD']; // Gold, Silver, Platinum, Palladium

/**
 * Fetch latest metal prices from Metals-API
 */
export async function fetchMetalRates(): Promise<MetalRate[]> {
  if (!METALS_API_KEY) {
    throw new Error('METALS_API_KEY not configured');
  }

  const response = await fetch(
    `${METALS_API_URL}/latest?access_key=${METALS_API_KEY}&base=USD&symbols=${SUPPORTED_METALS.join(',')}`,
    { headers: { 'Accept': 'application/json' } }
  );

  if (!response.ok) {
    throw new Error(`Metals API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Metals API error: ${data.error?.info || 'Unknown error'}`);
  }

  // API returns rates as USD per metal (e.g., 1 XAU = 2000 USD)
  // We need to invert for consistency (1 USD = 0.0005 XAU)
  return SUPPORTED_METALS.map(symbol => ({
    symbol,
    rate: 1 / data.rates[symbol], // Invert rate
    unit: 'oz'
  }));
}

/**
 * Fetch with retry logic
 */
export async function fetchMetalRatesWithRetry(): Promise<MetalRate[]> {
  return withIngestionRetry('metals', fetchMetalRates);
}

/**
 * Get historical metal rate
 */
export async function fetchHistoricalMetalRate(
  symbol: string,
  date: string
): Promise<MetalRate | null> {
  if (!METALS_API_KEY) {
    throw new Error('METALS_API_KEY not configured');
  }

  const response = await fetch(
    `${METALS_API_URL}/${date}?access_key=${METALS_API_KEY}&base=USD&symbols=${symbol}`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  if (!data.success || !data.rates[symbol]) {
    return null;
  }

  return {
    symbol,
    rate: 1 / data.rates[symbol],
    unit: 'oz'
  };
}
```

### Task 12.2: Update Ingestion Cron
Replace hardcoded metals with API fetch.

```typescript
// Update src/app/api/cron/ingest-eod/route.ts
import { fetchMetalRatesWithRetry } from '@/lib/providers/metals';

async function ingestMetalRates(): Promise<void> {
  const metalRates = await fetchMetalRatesWithRetry();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Insert rates into database
  for (const metal of metalRates) {
    await db.insert(rates).values({
      symbol: metal.symbol,
      rate: metal.rate.toString(),
      date: today,
      source: 'metals-api',
      assetClass: 'metals'
    }).onConflictDoUpdate({
      target: [rates.symbol, rates.date],
      set: { rate: metal.rate.toString(), updatedAt: new Date() }
    });
  }

  console.log(`[METALS] Ingested ${metalRates.length} rates`);
}
```

### Task 12.3: Add Fallback Provider
Create backup provider in case primary fails.

```typescript
// Add to src/lib/providers/metals.ts

const GOLDAPI_KEY = process.env.GOLDAPI_KEY;
const GOLDAPI_URL = 'https://www.goldapi.io/api';

/**
 * Fallback: Fetch from GoldAPI
 */
async function fetchFromGoldAPI(): Promise<MetalRate[]> {
  if (!GOLDAPI_KEY) {
    throw new Error('No fallback provider configured');
  }

  const rates: MetalRate[] = [];

  for (const symbol of ['XAU', 'XAG']) { // GoldAPI only has gold/silver
    const response = await fetch(`${GOLDAPI_URL}/${symbol}/USD`, {
      headers: { 'x-access-token': GOLDAPI_KEY }
    });

    if (response.ok) {
      const data = await response.json();
      rates.push({
        symbol,
        rate: 1 / data.price,
        unit: 'oz'
      });
    }
  }

  return rates;
}

/**
 * Fetch with fallback
 */
export async function fetchMetalRatesWithFallback(): Promise<MetalRate[]> {
  try {
    return await fetchMetalRatesWithRetry();
  } catch (primaryError) {
    console.warn('[METALS] Primary provider failed, trying fallback');

    try {
      const fallbackRates = await fetchFromGoldAPI();
      if (fallbackRates.length > 0) {
        return fallbackRates;
      }
    } catch {
      // Fallback also failed
    }

    throw primaryError;
  }
}
```

### Task 12.4: Add Environment Variables
Update configuration.

```bash
# Add to .env.example

# Metals API (Primary)
METALS_API_KEY=your-metals-api-key

# GoldAPI (Fallback)
GOLDAPI_KEY=your-goldapi-key
```

### Task 12.5: Update Asset Registry
Add new metals to the registry.

```typescript
// Update src/data/assets.ts or wherever assets are defined

export const METAL_ASSETS = [
  { symbol: 'XAU', name: 'Gold', class: 'metals', unit: 'troy ounce' },
  { symbol: 'XAG', name: 'Silver', class: 'metals', unit: 'troy ounce' },
  { symbol: 'XPT', name: 'Platinum', class: 'metals', unit: 'troy ounce' },
  { symbol: 'XPD', name: 'Palladium', class: 'metals', unit: 'troy ounce' },
  // Future expansion
  // { symbol: 'XRH', name: 'Rhodium', class: 'metals', unit: 'troy ounce' },
];
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/providers/metals.ts` |
| Modify | `src/app/api/cron/ingest-eod/route.ts` |
| Modify | `.env.example` |
| Modify | Asset registry file |

---

## Acceptance Criteria

- [ ] Live metal prices fetched from Metals-API
- [ ] Retry logic applied to metal fetching
- [ ] Fallback provider (GoldAPI) works
- [ ] Rates stored with correct precision
- [ ] All 4 precious metals supported (XAU, XAG, XPT, XPD)

---

## Testing

```bash
# Test metals provider directly (create test script)
# src/scripts/test-metals.ts
import { fetchMetalRates } from '../lib/providers/metals';

async function test() {
  const rates = await fetchMetalRates();
  console.log('Metal rates:', rates);
}

test();

# Run test
npx ts-node src/scripts/test-metals.ts

# Verify via API after ingestion
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=XAU"
```

---

## Cost Considerations

- Metals-API free tier: 100 requests/month
- Daily ingestion = 30-31 requests/month
- Leaves headroom for retries and historical fetches
- Consider paid tier ($15/mo) for production reliability

---

## Next Step
Proceed to `13-asset-expansion.md`
