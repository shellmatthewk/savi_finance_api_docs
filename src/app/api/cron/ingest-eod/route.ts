import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { rates } from '@/db/schema';
import { invalidateRatesCache, purgeEdgeCache } from '@/lib/cache';
import { withIngestionRetry, RetryError } from '@/lib/retry';
import { recordProviderSuccess, recordProviderFailure } from '@/lib/providerHealth';
import { sendAlert, Alerts } from '@/lib/alerts';
import { fetchMetalRatesWithFallback } from '@/lib/providers/metals';

export const dynamic = 'force-dynamic';
// maxDuration must accommodate retry delays: 1min + 5min = 6min+
// Vercel Pro/Enterprise max is 300s, so we reduce delays for serverless environment
export const maxDuration = 300; // Allow up to 300 seconds (Vercel Pro limit)

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
    const failureError = error instanceof RetryError ? error.lastError : (error instanceof Error ? error : new Error(String(error)));
    const failures = await recordProviderFailure('fiat', failureError);
    console.error(`[FIAT] Provider failure. Consecutive failures: ${failures}`, { error: failureError.message });
    await sendAlert(Alerts.ingestionFailure('fiat', failureError.message, failures));
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
    const failureError = error instanceof RetryError ? error.lastError : (error instanceof Error ? error : new Error(String(error)));
    const failures = await recordProviderFailure('crypto', failureError);
    console.error(`[CRYPTO] Provider failure. Consecutive failures: ${failures}`, { error: failureError.message });
    await sendAlert(Alerts.ingestionFailure('crypto', failureError.message, failures));
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
    const failureError = error instanceof RetryError ? error.lastError : (error instanceof Error ? error : new Error(String(error)));
    const failures = await recordProviderFailure('stocks', failureError);
    console.error(`[STOCKS] Provider failure. Consecutive failures: ${failures}`, { error: failureError.message });
    await sendAlert(Alerts.ingestionFailure('stocks', failureError.message, failures));
  }

  return rateData;
}

async function ingestMetalRates(): Promise<RateData[]> {
  const today = getToday();
  const rateData: RateData[] = [];

  try {
    const metalRates = await fetchMetalRatesWithFallback();

    for (const metal of metalRates) {
      rateData.push({
        assetClass: 'metals',
        symbol: `${metal.symbol}/USD`,
        rate: String(metal.rate),
        baseCurrency: 'USD',
        recordedDate: today,
      });
    }

    await recordProviderSuccess('metals');
  } catch (error) {
    const failureError = error instanceof RetryError ? error.lastError : (error instanceof Error ? error : new Error(String(error)));
    const failures = await recordProviderFailure('metals', failureError);
    console.error(`[METALS] Provider failure. Consecutive failures: ${failures}`, { error: failureError.message });
    await sendAlert(Alerts.ingestionFailure('metals', failureError.message, failures));
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
      ingestMetalRates(),
    ]);

    const allRates = [...fiatRates, ...cryptoRates, ...stockRates, ...metalRates];

    // Check if all providers failed (critical alert)
    if (allRates.length === 0) {
      await sendAlert({
        title: 'Critical: All Data Ingestion Failed',
        message: 'No data was ingested from any provider',
        severity: 'critical',
        context: {
          providers: ['fiat', 'crypto', 'stocks', 'metals'],
          action: 'Check all provider APIs and network connectivity',
        },
      });
    }

    // Invalidate cache BEFORE database insert to prevent stale cache serving
    if (allRates.length > 0) {
      const ingestedSymbols = [...new Set(allRates.map(r => r.symbol))];
      await invalidateRatesCache(ingestedSymbols);
      await purgeEdgeCache(ingestedSymbols.map(s => `rates-${s}`));
      console.log(`Cache invalidated for ${ingestedSymbols.length} symbols`);
    }

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
    await sendAlert({
      title: 'EOD Ingestion Process Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      severity: 'critical',
      context: {
        action: 'Check ingestion logs and provider health',
      },
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
