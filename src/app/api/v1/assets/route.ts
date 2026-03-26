import { NextResponse, type NextRequest } from 'next/server';
import { authenticateApiKey } from '@/lib/authenticateApiKey';
import { rateLimitMiddleware, createRateLimitHeaders, checkRateLimit } from '@/lib/rateLimit';
import { getSymbolsByAssetClass, getAssetClassSummary } from '@/db/queries/rates';
import { logUsage } from '@/db/queries/usage';
import type { AssetClass } from '@/db/schema';
import { getFromCache, setInCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface AssetsResponse {
  asset_classes: {
    name: AssetClass;
    symbol_count: number;
    symbols: string[];
  }[];
  total_symbols: number;
  cross_pairs: {
    supported: boolean;
    format: string;
    note: string;
  };
}

/**
 * GET /api/v1/assets
 *
 * Get available symbols grouped by asset class
 *
 * Query params:
 * - asset_class: optional filter ("fiat", "crypto", "stocks", "metals")
 *
 * Response is cached for 1 hour
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
    const assetClassParam = searchParams.get('asset_class')?.toLowerCase() as AssetClass | undefined;

    const validAssetClasses: AssetClass[] = ['fiat', 'crypto', 'stocks', 'metals'];

    if (assetClassParam && !validAssetClasses.includes(assetClassParam)) {
      return NextResponse.json(
        {
          error: 'Invalid asset class',
          message: `Valid asset classes are: ${validAssetClasses.join(', ')}`,
        },
        { status: 400, headers: createRateLimitHeaders(rateLimitInfo) }
      );
    }

    // Generate cache key based on asset class
    const cacheKey = assetClassParam ? `assets:${assetClassParam}` : 'assets:all';

    // Check cache first
    const cachedResponse = await getFromCache<AssetsResponse>(cacheKey);
    if (cachedResponse) {
      logUsage(auth.apiKeyId, auth.userId, '/api/v1/assets').catch(console.error);
      const surrogateKey = assetClassParam ? `assets-${assetClassParam}` : 'assets-all';
      const headers = {
        ...createRateLimitHeaders(rateLimitInfo),
        'X-Cache': 'HIT',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        'Vary': 'x-api-key',
        'Surrogate-Key': surrogateKey,
      };
      return NextResponse.json(cachedResponse, { headers });
    }

    // Fetch data
    const assetClasses: AssetsResponse['asset_classes'] = [];
    let totalSymbols = 0;

    if (assetClassParam) {
      // Fetch single asset class
      const symbols = await getSymbolsByAssetClass(assetClassParam);
      assetClasses.push({
        name: assetClassParam,
        symbol_count: symbols.length,
        symbols,
      });
      totalSymbols = symbols.length;
    } else {
      // Fetch all asset classes
      const summary = await getAssetClassSummary();

      for (const { assetClass, count } of summary) {
        const symbols = await getSymbolsByAssetClass(assetClass);
        assetClasses.push({
          name: assetClass,
          symbol_count: count,
          symbols,
        });
        totalSymbols += count;
      }
    }

    // Log usage (async, don't await)
    logUsage(auth.apiKeyId, auth.userId, '/api/v1/assets').catch(console.error);

    const response: AssetsResponse = {
      asset_classes: assetClasses,
      total_symbols: totalSymbols,
      cross_pairs: {
        supported: true,
        format: 'BASE/QUOTE (e.g., EUR/JPY)',
        note: 'Any combination of supported currencies can be triangulated using /api/v1/rates?symbol=BASE/QUOTE',
      },
    };

    // Cache the response for 24 hours
    await setInCache(cacheKey, response, { ttl: 86400 });

    // Edge cache for 24 hours with stale-while-revalidate
    const surrogateKey = assetClassParam ? `assets-${assetClassParam}` : 'assets-all';
    const headers = {
      ...createRateLimitHeaders(rateLimitInfo),
      'X-Cache': 'MISS',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      'Vary': 'x-api-key',
      'Surrogate-Key': surrogateKey,
    };

    return NextResponse.json(response, { headers });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Assets API error:', errorMessage, errorStack);
    const response: { error: string; details?: string } = { error: 'Internal server error' };
    if (process.env.NODE_ENV !== 'production') {
      response.details = errorMessage;
    }
    return NextResponse.json(response, { status: 500 });
  }
}
