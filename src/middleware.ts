import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Generate deterministic cache key based on normalized query parameters
 */
function generateEdgeCacheKey(request: NextRequest): string {
  const url = request.nextUrl;
  const params = new URLSearchParams();

  // Sort params for consistent keys
  const sortedKeys = Array.from(url.searchParams.keys()).sort();
  for (const key of sortedKeys) {
    params.set(key, url.searchParams.get(key)!);
  }

  return `${url.pathname}?${params.toString()}`;
}

export function middleware(request: NextRequest) {
  // Only apply to v1 API routes
  if (!request.nextUrl.pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // Disable cache for auth routes
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // Enable edge caching for rate and asset endpoints
  if (
    request.nextUrl.pathname.startsWith('/api/v1/rates') ||
    request.nextUrl.pathname.startsWith('/api/v1/assets')
  ) {
    // Cache-Control for edge:
    // - public: can be cached by CDN
    // - s-maxage=86400: edge cache for 24 hours
    // - stale-while-revalidate=3600: serve stale for 1 hour while fetching fresh
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=86400, stale-while-revalidate=3600'
    );

    // Vary by API key to ensure per-user rate limiting still works
    response.headers.set('Vary', 'x-api-key');

    // Generate surrogate key for targeted invalidation
    // For rates endpoints, use symbol parameter; for assets, use asset_class
    let surrogateKey = 'api';
    const symbol = request.nextUrl.searchParams.get('symbol');
    const symbols = request.nextUrl.searchParams.get('symbols');
    const assetClass = request.nextUrl.searchParams.get('asset_class');

    if (symbol) {
      surrogateKey = `rates-${symbol}`;
    } else if (symbols) {
      surrogateKey = 'rates-batch';
    } else if (assetClass) {
      surrogateKey = `assets-${assetClass}`;
    } else if (request.nextUrl.pathname.startsWith('/api/v1/rates')) {
      surrogateKey = 'rates-all';
    } else if (request.nextUrl.pathname.startsWith('/api/v1/assets')) {
      surrogateKey = 'assets-all';
    }

    response.headers.set('Surrogate-Key', surrogateKey);

    // Add cache-key header for debugging
    response.headers.set('X-Cache-Key', generateEdgeCacheKey(request));
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
