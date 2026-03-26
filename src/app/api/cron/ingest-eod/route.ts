import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { rates } from '@/db/schema';
import { invalidateRatesCache, purgeEdgeCache } from '@/lib/cache';
import { withIngestionRetry, RetryError } from '@/lib/retry';
import { recordProviderSuccess, recordProviderFailure } from '@/lib/providerHealth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for data fetching

/**
 * Verify the request is from Vercel Cron
 */
function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development or if no secret is configured, allow the request
  if (!cronSecret) {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

interface RateData {
  assetClass: 'fiat' | 'crypto' | 'stocks' | 'metals';
  symbol: string;
  rate: string;
  baseCurrency: string;
  recordedDate: string;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFiatRates(): Promise<RateData[]> {
  const today = getToday();
  const symbols = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL'];
  const rateData: RateData[] = [];

  try {
    await withIngestionRetry('fiat', async () => {
      const url = `https://api.exchangerate.host/latest?base=USD&symbols=${symbols.join(',')}`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();

      if (data.rates) {
        for (const [currency, rate] of Object.entries(data.rates)) {
          rateData.push({
            assetClass: 'fiat',
            symbol: `USD/${currency}`,
            rate: String(rate),
            baseCurrency: 'USD',
            recordedDate: today,
          });
        }
      }
    });

    await recordProviderSuccess('fiat');
  } catch (error) {
    if (error instanceof RetryError) {
      const failures = await recordProviderFailure('fiat', error.lastError);
      console.error(`[FIAT] All retries exhausted. Consecutive failures: ${failures}`);
    } else {
      console.error('Fiat fetch error:', error);
    }
  }

  return rateData;
}

async function fetchCryptoRates(): Promise<RateData[]> {
  const today = getToday();
  const coins = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polkadot'];
  const symbolMap: Record<string, string> = {
    bitcoin: 'BTC/USD',
    ethereum: 'ETH/USD',
    solana: 'SOL/USD',
    cardano: 'ADA/USD',
    polkadot: 'DOT/USD',
  };
  const rateData: RateData[] = [];

  try {
    await withIngestionRetry('crypto', async () => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coins.join(',')}&vs_currencies=usd`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();

      for (const [coinId, priceData] of Object.entries(data)) {
        const symbol = symbolMap[coinId];
        const price = (priceData as { usd: number }).usd;
        if (symbol && price) {
          rateData.push({
            assetClass: 'crypto',
            symbol,
            rate: String(price),
            baseCurrency: 'USD',
            recordedDate: today,
          });
        }
      }
    });

    await recordProviderSuccess('crypto');
  } catch (error) {
    if (error instanceof RetryError) {
      const failures = await recordProviderFailure('crypto', error.lastError);
      console.error(`[CRYPTO] All retries exhausted. Consecutive failures: ${failures}`);
    } else {
      console.error('Crypto fetch error:', error);
    }
  }

  return rateData;
}

async function fetchStockRates(): Promise<RateData[]> {
  const today = getToday();
  const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'];
  const rateData: RateData[] = [];
  const apiKey = process.env.FINANCIAL_DATA_API_KEY;

  if (!apiKey) return rateData;

  try {
    await withIngestionRetry('stocks', async () => {
      const url = `https://financialmodelingprep.com/api/v3/quote/${symbols.join(',')}?apikey=${apiKey}`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        for (const stock of data) {
          if (stock.symbol && stock.price) {
            rateData.push({
              assetClass: 'stocks',
              symbol: stock.symbol,
              rate: String(stock.price),
              baseCurrency: 'USD',
              recordedDate: today,
            });
          }
        }
      }
    });

    await recordProviderSuccess('stocks');
  } catch (error) {
    if (error instanceof RetryError) {
      const failures = await recordProviderFailure('stocks', error.lastError);
      console.error(`[STOCKS] All retries exhausted. Consecutive failures: ${failures}`);
    } else {
      console.error('Stock fetch error:', error);
    }
  }

  return rateData;
}

async function fetchMetalRates(): Promise<RateData[]> {
  const today = getToday();
  const rateData: RateData[] = [];

  try {
    await withIngestionRetry('metals', async () => {
      // Use fallback values for MVP (metals APIs often require paid access)
      const fallbackRates = [
        { symbol: 'XAU/USD', rate: '2340.50' },
        { symbol: 'XAG/USD', rate: '27.45' },
        { symbol: 'XPT/USD', rate: '985.00' },
      ];

      for (const metal of fallbackRates) {
        rateData.push({
          assetClass: 'metals',
          ...metal,
          baseCurrency: 'USD',
          recordedDate: today,
        });
      }
    });

    await recordProviderSuccess('metals');
  } catch (error) {
    if (error instanceof RetryError) {
      const failures = await recordProviderFailure('metals', error.lastError);
      console.error(`[METALS] All retries exhausted. Consecutive failures: ${failures}`);
    } else {
      console.error('Metals fetch error:', error);
    }
  }

  return rateData;
}

/**
 * GET /api/cron/ingest-eod
 *
 * Cron endpoint for daily EOD data ingestion.
 * Called by Vercel Cron at 6 AM UTC (after US market close).
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Fetch data from all sources
    const [fiatRates, cryptoRates, stockRates, metalRates] = await Promise.all([
      fetchFiatRates(),
      fetchCryptoRates(),
      fetchStockRates(),
      fetchMetalRates(),
    ]);

    const allRates = [...fiatRates, ...cryptoRates, ...stockRates, ...metalRates];

    // Insert into database
    const db = getDb();
    let inserted = 0;

    if (allRates.length > 0) {
      const result = await db
        .insert(rates)
        .values(allRates)
        .onConflictDoNothing({ target: [rates.symbol, rates.recordedDate] })
        .returning();
      inserted = result.length;
    }

    // Invalidate cache after successful ingestion
    if (inserted > 0) {
      const ingestedSymbols = [...new Set(allRates.map(r => r.symbol))];
      await invalidateRatesCache(ingestedSymbols);
      await purgeEdgeCache(ingestedSymbols.map(s => `rates-${s}`));
      console.log(`Cache invalidated for ${ingestedSymbols.length} symbols`);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      date: getToday(),
      stats: {
        fiat: fiatRates.length,
        crypto: cryptoRates.length,
        stocks: stockRates.length,
        metals: metalRates.length,
        total: allRates.length,
        inserted,
      },
      durationMs: duration,
    });
  } catch (error) {
    console.error('EOD ingestion failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
