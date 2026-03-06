import { NextResponse, type NextRequest } from 'next/server';
import { authenticateApiKey } from '@/lib/authenticateApiKey';
import { rateLimitMiddleware, createRateLimitHeaders, checkRateLimit } from '@/lib/rateLimit';
import { getLatestRate, getRates } from '@/db/queries/rates';
import { logUsage } from '@/db/queries/usage';

export const dynamic = 'force-dynamic';

interface RateResponse {
  symbol: string;
  rate: string;
  base_currency: string;
  asset_class: string;
  date: string;
  delayed_by: string;
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
    const symbolsParam = searchParams.get('symbols');
    const dateParam = searchParams.get('date');

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

    // Fetch rates for each symbol
    const rates: RateResponse[] = [];
    const notFound: string[] = [];

    for (const symbol of symbols) {
      let rate;

      if (dateParam) {
        // Fetch for specific date
        const date = new Date(dateParam);
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            {
              error: 'Invalid date',
              message: 'Please provide a valid ISO date (YYYY-MM-DD)',
            },
            { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
          );
        }
        const results = await getRates(symbol, date, date);
        rate = results[0];
      } else {
        // Fetch latest
        rate = await getLatestRate(symbol);
      }

      if (rate) {
        rates.push({
          symbol: rate.symbol,
          rate: rate.rate,
          base_currency: rate.baseCurrency,
          asset_class: rate.assetClass,
          date: rate.recordedDate,
          delayed_by: '24h',
        });
      } else {
        notFound.push(symbol);
      }
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

    return NextResponse.json(response, {
      headers: createRateLimitHeaders(rateLimitInfo),
    });
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
