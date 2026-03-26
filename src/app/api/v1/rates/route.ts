import { NextResponse, type NextRequest } from 'next/server';
import { authenticateApiKey } from '@/lib/authenticateApiKey';
import { rateLimitMiddleware, createRateLimitHeaders, checkRateLimit, type RateLimitResult } from '@/lib/rateLimit';
// Removed unused imports: getLatestRate, getRates (now using getRateWithFallback)
import { logUsage } from '@/db/queries/usage';
import {
  getFromCache,
  setInCache,
  incrementCacheHit,
  incrementCacheMiss,
} from '@/lib/cache';
import {
  parseCrossPair,
  isCrossPair,
  calculateTriangulation,
  canTriangulate,
} from '@/lib/triangulation';
import { getSupportedSymbols, getUsdRate } from '@/lib/rates';
// Stale data utilities available for future use if needed
// import { getRateWithFallback, logStaleDataUsage, incrementStaleDataCount } from '@/lib/staleData';
import { getRateResilient } from '@/lib/resilientData';

export const dynamic = 'force-dynamic';

interface RateResponse {
  symbol: string;
  rate: string;
  base_currency: string;
  asset_class: string;
  date: string;
  delayed_by: string;
}

interface TriangulatedRateResponse {
  data: {
    symbol: string;
    rate: number;
    inverseRate: number;
    date: string;
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

/**
 * GET /api/v1/rates
 *
 * Get current (EOD) rates for specified symbols
 *
 * Query params:
 * - symbols: comma-separated list (e.g., "BTC/USD,USD/EUR")
 * - asset_class: optional filter ("fiat", "crypto", "stocks", "metals")
 * - date: optional ISO date (defaults to latest)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate via API key
    const auth = await authenticateApiKey(request);

    // Check rate limit
    const rateLimitResponse = await rateLimitMiddleware(auth.apiKeyId, auth.plan);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get rate limit info for headers
    const rateLimitInfo = await checkRateLimit(auth.apiKeyId, auth.plan);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const symbolParam = searchParams.get('symbol');
    const symbolsParam = searchParams.get('symbols');
    const dateParam = searchParams.get('date');

    // Check if this is a cross-rate request (single symbol parameter)
    if (symbolParam && isCrossPair(symbolParam)) {
      const auth_response = await handleCrossRateRequest(
        symbolParam,
        searchParams,
        rateLimitInfo
      );
      logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates').catch(console.error);
      return auth_response;
    }

    if (!symbolsParam) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'Please provide at least one symbol using the "symbols" query parameter',
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim().toUpperCase());

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          error: 'Invalid symbols',
          message: 'Please provide at least one valid symbol',
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    if (symbols.length > 50) {
      return NextResponse.json(
        {
          error: 'Too many symbols',
          message: 'Maximum 50 symbols per request',
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Validate and normalize date param early if provided
    let normalizedDate: string | undefined;
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date',
            message: 'Please provide a valid ISO date (YYYY-MM-DD)',
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
        );
      }
      // Normalize date to YYYY-MM-DD format
      normalizedDate = parsedDate.toISOString().split('T')[0];
    }

    // Fetch rates for each symbol with graceful degradation
    const rates: RateResponse[] = [];
    const notFound: string[] = [];
    let allCacheHits = true;
    let hasServiceDegradation = false;
    let degradationReason: string | undefined;
    const staleMetadata: Record<
      string,
      { stale: boolean; staleReason?: string; dataAge?: number; requestedDate?: string | null; degraded?: boolean; degradedReason?: string }
    > = {};

    for (const symbol of symbols) {
      // Use resilient data access with graceful degradation
      const { data: rate, source, degraded, degradedReason } = await getRateResilient(
        symbol,
        normalizedDate ?? undefined
      );

      if (!rate) {
        notFound.push(symbol);
        continue;
      }

      if (source !== 'cache') {
        allCacheHits = false;
      }

      if (degraded) {
        hasServiceDegradation = true;
        degradationReason = degradationReason || degradedReason;
      }

      const rateResponse: RateResponse = {
        symbol: rate.symbol,
        rate: rate.rate,
        base_currency: rate.baseCurrency,
        asset_class: rate.assetClass,
        date: rate.recordedDate,
        delayed_by: '24h',
      };
      rates.push(rateResponse);

      // Store degradation metadata
      staleMetadata[symbol] = {
        stale: false,
        ...(degraded && {
          degraded: true,
          degradedReason,
        }),
      };
    }

    // Track cache stats
    if (allCacheHits && rates.length > 0) {
      incrementCacheHit().catch(console.error);
    } else {
      incrementCacheMiss().catch(console.error);
    }

    // If all symbols not found and services degraded, return 503
    if (rates.length === 0 && hasServiceDegradation) {
      logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates').catch(console.error);
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          degraded: true,
          reason: degradationReason || 'Data services unavailable',
        },
        { status: 503, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Log usage (async, don't await)
    logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates').catch(console.error);

    const response: {
      data: RateResponse[];
      not_found?: string[];
      meta?: {
        cache: 'HIT' | 'MISS';
        degraded?: boolean;
        degradation_reason?: string;
        stale_by_symbol?: Record<string, { stale: boolean; staleReason?: string; dataAge?: number; requestedDate?: string | null; degraded?: boolean; degradedReason?: string }>;
        timestamp: string;
      };
    } = { data: rates };

    if (notFound.length > 0) {
      response.not_found = notFound;
    }

    // Include metadata with degradation information if applicable
    const hasDegradedData = Object.values(staleMetadata).some((m) => m.degraded);
    response.meta = {
      cache: allCacheHits && rates.length > 0 ? 'HIT' : 'MISS',
      ...(hasServiceDegradation && { degraded: true, degradation_reason: degradationReason }),
      ...(hasDegradedData && { stale_by_symbol: staleMetadata }),
      timestamp: new Date().toISOString(),
    };

    const headers = {
      ...createRateLimitHeaders(rateLimitInfo),
      'X-Cache': allCacheHits && rates.length > 0 ? 'HIT' : 'MISS',
      'X-Degraded': hasServiceDegradation ? 'true' : 'false',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      'Vary': 'x-api-key',
      'Surrogate-Key': symbols.length === 1 ? `rates-${symbols[0]}` : 'rates-batch',
    };

    return NextResponse.json(response, { headers });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Rates API error:', errorMessage);
    const response: { error: string; details?: string } = { error: 'Internal server error' };
    if (process.env.NODE_ENV !== 'production') {
      response.details = errorMessage;
    }
    return NextResponse.json(response, { status: 500 });
  }
}

async function handleCrossRateRequest(
  symbol: string,
  searchParams: URLSearchParams,
  rateLimitInfo: RateLimitResult
): Promise<NextResponse> {
  const parsed = parseCrossPair(symbol);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid cross-rate format' },
      { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
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
      { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
    );
  }

  // Check cache first
  const cacheKey = `triangulated:${base}:${quote}:${date || 'latest'}`;
  const cached = await getFromCache<TriangulatedRateResponse>(cacheKey);
  if (cached) {
    incrementCacheHit().catch(console.error);
    const response = {
      ...cached,
      meta: { ...cached.meta, cache: 'HIT' as const },
    };
    return NextResponse.json(response, {
      headers: createRateLimitHeaders(rateLimitInfo),
    });
  }

  incrementCacheMiss().catch(console.error);

  // Fetch USD rates for both currencies
  const [usdToBase, usdToQuote] = await Promise.all([
    getUsdRate(base, date),
    getUsdRate(quote, date),
  ]);

  if (!usdToBase || !usdToQuote) {
    return NextResponse.json(
      { error: 'Unable to calculate cross-rate: missing source data' },
      { status: 404, headers: createRateLimitHeaders(rateLimitInfo) }
    );
  }

  // Calculate triangulation
  const result = calculateTriangulation(base, quote, usdToBase, usdToQuote);

  const response: TriangulatedRateResponse = {
    data: {
      symbol: `${base}/${quote}`,
      rate: result.rate,
      inverseRate: result.inverseRate,
      date: date || new Date().toISOString().split('T')[0],
    },
    meta: {
      triangulated: true,
      baseCurrency: base,
      quoteCurrency: quote,
      usdToBase: result.usdToBase,
      usdToQuote: result.usdToQuote,
      precision: result.precision,
      cache: 'MISS',
    },
  };

  // Cache the triangulated result
  await setInCache(cacheKey, response);

  return NextResponse.json(response, {
    headers: createRateLimitHeaders(rateLimitInfo),
  });
}
