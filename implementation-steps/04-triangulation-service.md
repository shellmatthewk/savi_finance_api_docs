# Step 04: Triangulation Service

## Goal
Create the rate triangulation calculation logic for cross-rate pairs.

## Prerequisites
- None (independent module)

---

## Concept

Rate triangulation calculates exchange rates between two currencies using USD as an intermediary.

**Formula:** `Rate(A -> B) = Rate(USD -> B) / Rate(USD -> A)`

**Example:** To get `EUR -> JPY`:
- If `USD -> EUR = 0.92` and `USD -> JPY = 149.50`
- Then `EUR -> JPY = 149.50 / 0.92 = 162.50`

---

## Tasks

### Task 4.1: Create Triangulation Module
Create `src/lib/triangulation.ts` with core logic.

```typescript
// src/lib/triangulation.ts

export interface TriangulationResult {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  inverseRate: number;
  triangulated: boolean;
  usdToBase: number;
  usdToQuote: number;
  precision: number;
}

const DECIMAL_PRECISION = 8;

/**
 * Triangulate rate from base to quote currency using USD as intermediary
 *
 * @param usdToBase - Rate from USD to base currency (e.g., USD -> EUR = 0.92)
 * @param usdToQuote - Rate from USD to quote currency (e.g., USD -> JPY = 149.50)
 * @returns Triangulated rate from base to quote
 */
export function triangulateRate(
  usdToBase: number,
  usdToQuote: number
): number {
  if (usdToBase <= 0 || usdToQuote <= 0) {
    throw new Error('Rates must be positive numbers');
  }

  // Rate(Base -> Quote) = Rate(USD -> Quote) / Rate(USD -> Base)
  const rate = usdToQuote / usdToBase;

  return roundToPrecision(rate, DECIMAL_PRECISION);
}

/**
 * Calculate full triangulation result with metadata
 */
export function calculateTriangulation(
  baseCurrency: string,
  quoteCurrency: string,
  usdToBase: number,
  usdToQuote: number
): TriangulationResult {
  const rate = triangulateRate(usdToBase, usdToQuote);
  const inverseRate = roundToPrecision(1 / rate, DECIMAL_PRECISION);

  return {
    baseCurrency,
    quoteCurrency,
    rate,
    inverseRate,
    triangulated: true,
    usdToBase,
    usdToQuote,
    precision: DECIMAL_PRECISION
  };
}

/**
 * Round number to specified decimal places
 */
function roundToPrecision(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Validate if triangulation is possible for given pair
 */
export function canTriangulate(
  baseCurrency: string,
  quoteCurrency: string,
  supportedSymbols: Set<string>
): { valid: boolean; error?: string } {
  if (baseCurrency === quoteCurrency) {
    return { valid: false, error: 'Base and quote currency cannot be the same' };
  }

  if (!supportedSymbols.has(baseCurrency)) {
    return { valid: false, error: `Unsupported base currency: ${baseCurrency}` };
  }

  if (!supportedSymbols.has(quoteCurrency)) {
    return { valid: false, error: `Unsupported quote currency: ${quoteCurrency}` };
  }

  return { valid: true };
}
```

### Task 4.2: Add Unit Tests
Create `src/lib/__tests__/triangulation.test.ts`.

```typescript
// src/lib/__tests__/triangulation.test.ts
import {
  triangulateRate,
  calculateTriangulation,
  canTriangulate
} from '../triangulation';

describe('triangulateRate', () => {
  it('calculates correct cross rate', () => {
    // USD -> EUR = 0.92, USD -> JPY = 149.50
    // EUR -> JPY = 149.50 / 0.92 = 162.5
    const result = triangulateRate(0.92, 149.5);
    expect(result).toBeCloseTo(162.5, 1);
  });

  it('handles same rate (1:1)', () => {
    const result = triangulateRate(1.5, 1.5);
    expect(result).toBe(1);
  });

  it('throws on zero rate', () => {
    expect(() => triangulateRate(0, 1)).toThrow();
    expect(() => triangulateRate(1, 0)).toThrow();
  });

  it('throws on negative rate', () => {
    expect(() => triangulateRate(-1, 1)).toThrow();
  });
});

describe('calculateTriangulation', () => {
  it('returns complete result object', () => {
    const result = calculateTriangulation('EUR', 'JPY', 0.92, 149.5);

    expect(result.baseCurrency).toBe('EUR');
    expect(result.quoteCurrency).toBe('JPY');
    expect(result.triangulated).toBe(true);
    expect(result.rate).toBeCloseTo(162.5, 1);
    expect(result.inverseRate).toBeCloseTo(0.00615, 4);
  });
});

describe('canTriangulate', () => {
  const symbols = new Set(['EUR', 'JPY', 'USD', 'GBP']);

  it('returns valid for supported pair', () => {
    expect(canTriangulate('EUR', 'JPY', symbols).valid).toBe(true);
  });

  it('rejects same currency', () => {
    const result = canTriangulate('EUR', 'EUR', symbols);
    expect(result.valid).toBe(false);
  });

  it('rejects unsupported currency', () => {
    const result = canTriangulate('EUR', 'XYZ', symbols);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('XYZ');
  });
});
```

### Task 4.3: Add Cross-Rate Parser
Parse cross-rate symbols like "EUR/JPY" or "EURUSD".

```typescript
// Add to src/lib/triangulation.ts

export interface ParsedCrossPair {
  base: string;
  quote: string;
}

/**
 * Parse a cross-rate symbol into base and quote currencies
 * Supports: EUR/JPY, EURJPY, EUR-JPY
 */
export function parseCrossPair(symbol: string): ParsedCrossPair | null {
  const normalized = symbol.toUpperCase().trim();

  // Handle slash format: EUR/JPY
  if (normalized.includes('/')) {
    const [base, quote] = normalized.split('/');
    if (base && quote && base.length >= 3 && quote.length >= 3) {
      return { base: base.trim(), quote: quote.trim() };
    }
  }

  // Handle dash format: EUR-JPY
  if (normalized.includes('-')) {
    const [base, quote] = normalized.split('-');
    if (base && quote) {
      return { base: base.trim(), quote: quote.trim() };
    }
  }

  // Handle concatenated format: EURJPY (6 chars = 3+3)
  if (normalized.length === 6 && !normalized.includes('/') && !normalized.includes('-')) {
    return {
      base: normalized.substring(0, 3),
      quote: normalized.substring(3, 6)
    };
  }

  return null;
}

/**
 * Check if symbol is a cross-pair request
 */
export function isCrossPair(symbol: string): boolean {
  return parseCrossPair(symbol) !== null;
}
```

---

## Files to Create

| Action | File |
|--------|------|
| Create | `src/lib/triangulation.ts` |
| Create | `src/lib/__tests__/triangulation.test.ts` |

---

## Acceptance Criteria

- [ ] `triangulateRate` returns correct calculated rate
- [ ] 8 decimal place precision maintained
- [ ] Unit tests pass for all cases
- [ ] Cross-pair parser handles all formats
- [ ] Validation rejects invalid pairs

---

## Testing

```bash
# Run unit tests
npm test src/lib/__tests__/triangulation.test.ts
```

---

## Next Step
Proceed to `05-triangulation-api.md`
