# Step 13: Asset Expansion

## Goal
Expand the supported asset registry to 50+ symbols across all classes.

## Prerequisites
- Step 12 completed (metals API working)

---

## Current State

~32 symbols across 4 asset classes. Target: 50+ symbols.

---

## Tasks

### Task 13.1: Expand Fiat Currencies
Add more global currencies.

```typescript
// src/data/assets.ts

export const FIAT_CURRENCIES = [
  // Major currencies (existing)
  { symbol: 'USD', name: 'US Dollar', class: 'fiat' },
  { symbol: 'EUR', name: 'Euro', class: 'fiat' },
  { symbol: 'GBP', name: 'British Pound', class: 'fiat' },
  { symbol: 'JPY', name: 'Japanese Yen', class: 'fiat' },
  { symbol: 'CHF', name: 'Swiss Franc', class: 'fiat' },
  { symbol: 'CAD', name: 'Canadian Dollar', class: 'fiat' },
  { symbol: 'AUD', name: 'Australian Dollar', class: 'fiat' },
  { symbol: 'NZD', name: 'New Zealand Dollar', class: 'fiat' },

  // Additional currencies (new)
  { symbol: 'CNY', name: 'Chinese Yuan', class: 'fiat' },
  { symbol: 'HKD', name: 'Hong Kong Dollar', class: 'fiat' },
  { symbol: 'SGD', name: 'Singapore Dollar', class: 'fiat' },
  { symbol: 'SEK', name: 'Swedish Krona', class: 'fiat' },
  { symbol: 'NOK', name: 'Norwegian Krone', class: 'fiat' },
  { symbol: 'DKK', name: 'Danish Krone', class: 'fiat' },
  { symbol: 'MXN', name: 'Mexican Peso', class: 'fiat' },
  { symbol: 'BRL', name: 'Brazilian Real', class: 'fiat' },
  { symbol: 'INR', name: 'Indian Rupee', class: 'fiat' },
  { symbol: 'KRW', name: 'South Korean Won', class: 'fiat' },
  { symbol: 'ZAR', name: 'South African Rand', class: 'fiat' },
  { symbol: 'PLN', name: 'Polish Zloty', class: 'fiat' },
];

// Total: 20 fiat currencies
```

### Task 13.2: Expand Crypto Assets
Add top cryptocurrencies by market cap.

```typescript
export const CRYPTO_ASSETS = [
  // Existing
  { symbol: 'BTC', name: 'Bitcoin', class: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', class: 'crypto' },

  // Top 20 expansion
  { symbol: 'BNB', name: 'BNB', class: 'crypto' },
  { symbol: 'XRP', name: 'XRP', class: 'crypto' },
  { symbol: 'SOL', name: 'Solana', class: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', class: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', class: 'crypto' },
  { symbol: 'TRX', name: 'TRON', class: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', class: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', class: 'crypto' },
  { symbol: 'DOT', name: 'Polkadot', class: 'crypto' },
  { symbol: 'MATIC', name: 'Polygon', class: 'crypto' },
  { symbol: 'LTC', name: 'Litecoin', class: 'crypto' },
  { symbol: 'SHIB', name: 'Shiba Inu', class: 'crypto' },
  { symbol: 'BCH', name: 'Bitcoin Cash', class: 'crypto' },
  { symbol: 'UNI', name: 'Uniswap', class: 'crypto' },
  { symbol: 'XLM', name: 'Stellar', class: 'crypto' },
  { symbol: 'ATOM', name: 'Cosmos', class: 'crypto' },
  { symbol: 'XMR', name: 'Monero', class: 'crypto' },
  { symbol: 'ETC', name: 'Ethereum Classic', class: 'crypto' },
];

// Total: 20 crypto assets
```

### Task 13.3: Expand Stock Tickers
Add major NASDAQ/NYSE stocks.

```typescript
export const STOCK_TICKERS = [
  // Tech giants
  { symbol: 'AAPL', name: 'Apple Inc.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', class: 'stocks', exchange: 'NASDAQ' },

  // Semiconductors
  { symbol: 'AMD', name: 'Advanced Micro Devices', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'INTC', name: 'Intel Corp.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', class: 'stocks', exchange: 'NASDAQ' },

  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'V', name: 'Visa Inc.', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'MA', name: 'Mastercard Inc.', class: 'stocks', exchange: 'NYSE' },

  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'UNH', name: 'UnitedHealth Group', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'PFE', name: 'Pfizer Inc.', class: 'stocks', exchange: 'NYSE' },

  // Consumer
  { symbol: 'WMT', name: 'Walmart Inc.', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'KO', name: 'Coca-Cola Co.', class: 'stocks', exchange: 'NYSE' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', class: 'stocks', exchange: 'NASDAQ' },
  { symbol: 'COST', name: 'Costco Wholesale', class: 'stocks', exchange: 'NASDAQ' },

  // ... more tickers
];

// Target: 30+ stock tickers
```

### Task 13.4: Update Data Providers
Modify providers to fetch expanded symbols.

```typescript
// Update crypto provider
// src/lib/providers/crypto.ts

const SUPPORTED_CRYPTO = [
  'BTC', 'ETH', 'BNB', 'XRP', 'SOL', 'ADA', 'DOGE', 'TRX',
  'AVAX', 'LINK', 'DOT', 'MATIC', 'LTC', 'SHIB', 'BCH',
  'UNI', 'XLM', 'ATOM', 'XMR', 'ETC'
];

export async function fetchCryptoRates(): Promise<CryptoRate[]> {
  // CoinGecko or similar API
  const ids = SUPPORTED_CRYPTO.map(symbolToCoinGeckoId).join(',');
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );
  // ... process response
}
```

### Task 13.5: Create Asset Registry API

```typescript
// Create src/app/api/admin/assets/route.ts
import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { FIAT_CURRENCIES, CRYPTO_ASSETS, STOCK_TICKERS, METAL_ASSETS } from '@/data/assets';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    totalAssets:
      FIAT_CURRENCIES.length +
      CRYPTO_ASSETS.length +
      STOCK_TICKERS.length +
      METAL_ASSETS.length,
    breakdown: {
      fiat: FIAT_CURRENCIES.length,
      crypto: CRYPTO_ASSETS.length,
      stocks: STOCK_TICKERS.length,
      metals: METAL_ASSETS.length
    },
    assets: {
      fiat: FIAT_CURRENCIES,
      crypto: CRYPTO_ASSETS,
      stocks: STOCK_TICKERS,
      metals: METAL_ASSETS
    }
  });
}

// POST endpoint for adding new assets (future)
export async function POST(request: Request) {
  // Implement asset addition
  // Validate provider supports the asset
  // Add to registry
}
```

### Task 13.6: Update Public Assets Endpoint
Reflect new assets in public API.

```typescript
// Update src/app/api/v1/assets/route.ts

export async function GET() {
  const allAssets = [
    ...FIAT_CURRENCIES,
    ...CRYPTO_ASSETS,
    ...STOCK_TICKERS,
    ...METAL_ASSETS
  ];

  return NextResponse.json({
    count: allAssets.length,
    assetClasses: ['fiat', 'crypto', 'stocks', 'metals'],
    assets: allAssets.map(a => ({
      symbol: a.symbol,
      name: a.name,
      class: a.class
    })),
    crossPairs: {
      supported: true,
      format: 'BASE/QUOTE',
      example: 'EUR/JPY'
    }
  });
}
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/data/assets.ts` |
| Create | `src/app/api/admin/assets/route.ts` |
| Modify | `src/app/api/v1/assets/route.ts` |
| Modify | `src/lib/providers/crypto.ts` |
| Modify | `src/lib/providers/stocks.ts` |
| Modify | `src/lib/providers/fiat.ts` |

---

## Acceptance Criteria

- [ ] 20+ fiat currencies supported
- [ ] 20+ crypto assets supported (top by market cap)
- [ ] 20+ stock tickers supported
- [ ] 4 precious metals supported
- [ ] Total: 50+ symbols
- [ ] All assets appear in `/api/v1/assets`
- [ ] Daily ingestion fetches all new assets

---

## Testing

```bash
# Check total asset count
curl "http://localhost:3000/api/v1/assets" | jq '.count'
# Should be 50+

# Test new assets after ingestion
curl -H "x-api-key: KEY" "http://localhost:3000/api/v1/rates?symbol=SOL"
curl -H "x-api-key: KEY" "http://localhost:3000/api/v1/rates?symbol=INR"
curl -H "x-api-key: KEY" "http://localhost:3000/api/v1/rates?symbol=NVDA"
```

---

## Provider Rate Limits

Be aware of free tier limits:
- CoinGecko: 10-50 calls/minute
- Alpha Vantage: 5 calls/minute, 500/day
- ExchangeRate-API: 1500/month

Batch requests where possible to stay within limits.

---

## Next Step
Proceed to `14-security-audit.md`
