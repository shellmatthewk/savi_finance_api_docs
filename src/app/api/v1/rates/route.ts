import { NextResponse, type NextRequest } from 'next/server';
import { authenticateApiKey } from '@/lib/authenticateApiKey';
import { rateLimitMiddleware, createRateLimitHeaders, checkRateLimit } from '@/lib/rateLimit';
import { getLatestRate, getRates } from '@/db/queries/rates';
import { logUsage } from '@/db/queries/usage';
import {
  getFromCache,
  setInCache,
  ratesCacheKey,
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

    // Validate date param early if provided
    let parsedDate: Date | undefined;
    if (dateParam) {
      parsedDate = new Date(dateParam);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date',
            message: 'Please provide a valid ISO date (YYYY-MM-DD)',
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
        );
      }
    }

    // Fetch rates for each symbol with cache-aside pattern
    const rates: RateResponse[] = [];
    const notFound: string[] = [];
    let allCacheHits = true;

    for (const symbol of symbols) {
      const cacheKey = ratesCacheKey(symbol, dateParam ?? undefined);

      // Check cache first
      const cachedRate = await getFromCache<RateResponse>(cacheKey);
      if (cachedRate) {
        rates.push(cachedRate);
        continue;
      }

      // Cache miss - fetch from database
      allCacheHits = false;
      let rate;

      if (parsedDate) {
        // Fetch for specific date
        const results = await getRates(symbol, parsedDate, parsedDate);
        rate = results[0];
      } else {
        // Fetch latest
        rate = await getLatestRate(symbol);
      }

      if (rate) {
        const rateResponse: RateResponse = {
          symbol: rate.symbol,
          rate: rate.rate,
          base_currency: rate.baseCurrency,
          asset_class: rate.assetClass,
          date: rate.recordedDate,
          delayed_by: '24h',
        };
        rates.push(rateResponse);

        // Cache the result
        await setInCache(cacheKey, rateResponse);
      } else {
        notFound.push(symbol);
      }
    }

    // Track cache stats
    if (allCacheHits && rates.length > 0) {
      incrementCacheHit().catch(console.error);
    } else {
      incrementCacheMiss().catch(console.error);
    }

    // Log usage (async, don't await)
    logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates').catch(console.error);

    const response: {
      data: RateResponse[];
      not_found?: string[];
    } = { data: rates };

    if (notFound.length > 0) {
      response.not_found = notFound;
    }

    const headers = {
      ...createRateLimitHeaders(rateLimitInfo),
      'X-Cache': allCacheHits && rates.length > 0 ? 'HIT' : 'MISS',
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
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

async function handleCrossRateRequest(
  symbol: string,
  searchParams: URLSearchParams,
  rateLimitInfo: any
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
    const response = {
      ...cached,
      meta: { ...cached.meta, cache: 'HIT' as const },
    };
    return NextResponse.json(response, {
      headers: createRateLimitHeaders(rateLimitInfo),
    });
  }

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
