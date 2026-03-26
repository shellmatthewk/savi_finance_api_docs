import { NextResponse, type NextRequest } from 'next/server';
import { authenticateApiKey } from '@/lib/authenticateApiKey';
import { rateLimitMiddleware, createRateLimitHeaders, checkRateLimit } from '@/lib/rateLimit';
import { getRates } from '@/db/queries/rates';
import { logUsage } from '@/db/queries/usage';
import type { Plan } from '@/db/schema';
import {
  getFromCache,
  setInCache,
  historyRatesCacheKey,
  incrementCacheHit,
  incrementCacheMiss,
} from '@/lib/cache';

export const dynamic = 'force-dynamic';

// History limits by plan (in days)
const HISTORY_LIMITS: Record<Plan, number> = {
  sandbox: 30,
  standard: 90,
};

/**
 * Get the maximum allowed from date based on plan
 */
function getMaxFromDate(plan: Plan): Date {
  const limit = HISTORY_LIMITS[plan] ?? HISTORY_LIMITS.sandbox;
  const date = new Date();
  date.setDate(date.getDate() - limit);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface HistoryPoint {
  date: string;
  rate: string;
}

interface HistoryResponse {
  symbol: string;
  base_currency: string;
  asset_class: string;
  from: string;
  to: string;
  history: HistoryPoint[];
  delayed_by: string;
}

/**
 * GET /api/v1/rates/history
 *
 * Get historical rates for a symbol within a date range
 *
 * Query params:
 * - symbol: required (e.g., "BTC/USD")
 * - from: ISO date (defaults to max allowed for plan)
 * - to: ISO date (defaults to today)
 *
 * History limits:
 * - Sandbox: 30 days
 * - Standard: 90 days
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
    const symbol = searchParams.get('symbol')?.trim().toUpperCase();
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!symbol) {
      return NextResponse.json(
        {
          error: 'Missing required parameter',
          message: 'Please provide a symbol using the "symbol" query parameter',
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Parse dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let toDate = today;
    if (toParam) {
      toDate = new Date(toParam);
      if (isNaN(toDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date',
            message: 'Please provide a valid ISO date for "to" (YYYY-MM-DD)',
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
        );
      }
      // Don't allow future dates
      if (toDate > today) {
        toDate = today;
      }
    }

    // Check from date against plan limits
    const maxFromDate = getMaxFromDate(auth.plan);
    let fromDate = maxFromDate;

    if (fromParam) {
      fromDate = new Date(fromParam);
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date',
            message: 'Please provide a valid ISO date for "from" (YYYY-MM-DD)',
          },
          { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
        );
      }

      // Check if requested from date exceeds plan limit
      if (fromDate < maxFromDate) {
        const historyLimit = HISTORY_LIMITS[auth.plan];
        const upgradeMessage =
          auth.plan === 'sandbox'
            ? ' Upgrade to Standard for 90 days of history.'
            : '';

        return NextResponse.json(
          {
            error: 'History limit exceeded',
            message: `Your ${auth.plan} plan allows up to ${historyLimit} days of history.${upgradeMessage}`,
            max_from_date: maxFromDate.toISOString().split('T')[0],
          },
          { status: 403, headers: createRateLimitHeaders(rateLimitInfo) }
        );
      }
    }

    // Ensure from <= to
    if (fromDate > toDate) {
      return NextResponse.json(
        {
          error: 'Invalid date range',
          message: '"from" date must be before or equal to "to" date',
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Generate cache key for this query
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];
    const cacheKey = historyRatesCacheKey(symbol, fromDateStr, toDateStr);

    // Check cache first
    const cachedResponse = await getFromCache<HistoryResponse>(cacheKey);
    if (cachedResponse) {
      // Log usage (async, don't await)
      logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates/history').catch(console.error);
      incrementCacheHit().catch(console.error);

      return NextResponse.json(cachedResponse, {
        headers: {
          ...createRateLimitHeaders(rateLimitInfo),
          'X-Cache': 'HIT',
        },
      });
    }

    // Cache miss - fetch from database
    incrementCacheMiss().catch(console.error);
    const rates = await getRates(symbol, fromDate, toDate);

    if (rates.length === 0) {
      return NextResponse.json(
        {
          error: 'No data found',
          message: `No historical data found for symbol "${symbol}" in the specified date range`,
        },
        { status: 404, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Log usage (async, don't await)
    logUsage(auth.apiKeyId, auth.userId, '/api/v1/rates/history').catch(console.error);

    const response: HistoryResponse = {
      symbol: rates[0].symbol,
      base_currency: rates[0].baseCurrency,
      asset_class: rates[0].assetClass,
      from: fromDateStr,
      to: toDateStr,
      history: rates.map((r) => ({
        date: r.recordedDate,
        rate: r.rate,
      })),
      delayed_by: '24h',
    };

    // Cache the response
    await setInCache(cacheKey, response);

    return NextResponse.json(response, {
      headers: {
        ...createRateLimitHeaders(rateLimitInfo),
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('History API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
