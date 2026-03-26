# Step 05: Triangulation API Integration

## Goal
Integrate triangulation service into the rates API endpoint.

## Prerequisites
- Step 04 completed (triangulation service exists)
- Step 01 completed (caching in place)

---

## Tasks

### Task 5.1: Update Rates Endpoint
Modify `src/app/api/v1/rates/route.ts` to detect and handle cross-rate requests.

```typescript
// Add imports at top
import {
  parseCrossPair,
  isCrossPair,
  calculateTriangulation,
  canTriangulate
} from '@/lib/triangulation';

// In GET handler, add cross-rate detection:
export async function GET(request: NextRequest) {
  // ... existing auth and validation ...

  const symbol = searchParams.get('symbol')?.toUpperCase();

  // Check if this is a cross-rate request
  if (symbol && isCrossPair(symbol)) {
    return handleCrossRateRequest(symbol, searchParams, apiKey);
  }

  // ... existing single-rate logic ...
}

async function handleCrossRateRequest(
  symbol: string,
  searchParams: URLSearchParams,
  apiKey: ApiKey
): Promise<NextResponse> {
  const parsed = parseCrossPair(symbol);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid cross-rate format' },
      { status: 400 }
    );
  }

  const { base, quote } = parsed;
  const date = searchParams.get('date');

  // Validate both currencies exist
  const supportedSymbols = await getSupportedSymbols();
  const validation = canTriangulate(base, quote, supportedSymbols);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  // Check cache first
  const cacheKey = `triangulated:${base}:${quote}:${date || 'latest'}`;
  const cached = await getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json({
      ...cached,
      meta: { ...cached.meta, cache: 'HIT' }
    });
  }

  // Fetch USD rates for both currencies
  const [usdToBase, usdToQuote] = await Promise.all([
    getUsdRate(base, date),
    getUsdRate(quote, date)
  ]);

  if (!usdToBase || !usdToQuote) {
    return NextResponse.json(
      { error: 'Unable to calculate cross-rate: missing source data' },
      { status: 404 }
    );
  }

  // Calculate triangulation
  const result = calculateTriangulation(base, quote, usdToBase, usdToQuote);

  const response = {
    data: {
      symbol: `${base}/${quote}`,
      rate: result.rate,
      inverseRate: result.inverseRate,
      date: date || new Date().toISOString().split('T')[0]
    },
    meta: {
      triangulated: true,
      baseCurrency: base,
      quoteCurrency: quote,
      usdToBase: result.usdToBase,
      usdToQuote: result.usdToQuote,
      precision: result.precision,
      cache: 'MISS'
    }
  };

  // Cache the triangulated result
  await setInCache(cacheKey, response);

  return NextResponse.json(response);
}
```

### Task 5.2: Add Helper Functions

```typescript
// Add to rates route or create src/lib/rates.ts

async function getSupportedSymbols(): Promise<Set<string>> {
  // Check cache first
  const cached = await getFromCache<string[]>('supported-symbols');
  if (cached) {
    return new Set(cached);
  }

  // Query database for distinct symbols
  const symbols = await db
    .selectDistinct({ symbol: rates.symbol })
    .from(rates);

  const symbolSet = symbols.map(s => s.symbol);
  await setInCache('supported-symbols', symbolSet, { ttl: 3600 }); // 1 hour

  return new Set(symbolSet);
}

async function getUsdRate(
  symbol: string,
  date?: string | null
): Promise<number | null> {
  // USD to USD is always 1
  if (symbol === 'USD') {
    return 1;
  }

  // Query the rate from database
  const query = db
    .select()
    .from(rates)
    .where(eq(rates.symbol, symbol));

  if (date) {
    query.where(and(eq(rates.symbol, symbol), eq(rates.date, new Date(date))));
  } else {
    query.orderBy(desc(rates.date)).limit(1);
  }

  const [rate] = await query;
  return rate?.rate ?? null;
}
```

### Task 5.3: Update Response Schema
Ensure triangulated responses have consistent schema.

```typescript
// Types for API responses
interface TriangulatedRateResponse {
  data: {
    symbol: string;      // "EUR/JPY"
    rate: number;        // 162.50000000
    inverseRate: number; // 0.00615385
    date: string;        // "2024-03-15"
  };
  meta: {
    triangulated: true;
    baseCurrency: string;
    quoteCurrency: string;
    usdToBase: number;
    usdToQuote: number;
    precision: number;
    cache: 'HIT' | 'MISS';
  };
}
```

### Task 5.4: Update Assets Endpoint
Document supported cross-pairs in assets response.

```typescript
// In src/app/api/v1/assets/route.ts

// Add to response:
{
  assets: [...],
  crossPairs: {
    supported: true,
    format: "BASE/QUOTE (e.g., EUR/JPY)",
    note: "Any combination of supported currencies can be triangulated"
  }
}
```

---

## Files to Modify

| Action | File |
|--------|------|
| Modify | `src/app/api/v1/rates/route.ts` |
| Modify | `src/app/api/v1/assets/route.ts` |
| Optional | Create `src/lib/rates.ts` for shared helpers |

---

## Acceptance Criteria

- [x] `GET /api/v1/rates?symbol=EUR/JPY` returns triangulated rate
- [x] Response includes `triangulated: true` in meta
- [x] Triangulated rates are cached
- [x] Invalid pairs return 400 with helpful error
- [x] USD self-rate returns 1

---

## Testing

```bash
# Direct rate
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=EUR"

# Cross-rate (triangulated)
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=EUR/JPY"
# Response should have: triangulated: true

# Alternative formats
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=EURJPY"
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=EUR-JPY"

# Invalid pair
curl -H "x-api-key: YOUR_KEY" "http://localhost:3000/api/v1/rates?symbol=XXX/YYY"
# Should return 400 error
```

---

## Next Step
Proceed to `06-stale-data-fallback.md`
