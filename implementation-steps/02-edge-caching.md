# Step 02: Edge Caching

## Goal
Configure Vercel Edge caching to serve API responses from the CDN edge, reducing backend load.

## Prerequisites
- Step 01 completed (Redis caching in place)
- Vercel deployment working

---

## Tasks

### Task 2.1: Create Edge Middleware
Create `src/middleware.ts` for API route caching.

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to v1 API routes
  if (request.nextUrl.pathname.startsWith('/api/v1/')) {
    const response = NextResponse.next();

    // Cache rate endpoints for 24 hours at the edge
    if (
      request.nextUrl.pathname.startsWith('/api/v1/rates') ||
      request.nextUrl.pathname.startsWith('/api/v1/assets')
    ) {
      // s-maxage = edge cache, stale-while-revalidate = serve stale while fetching
      response.headers.set(
        'Cache-Control',
        'public, s-maxage=86400, stale-while-revalidate=3600'
      );

      // Vary by API key to ensure per-user rate limiting still works
      response.headers.set('Vary', 'x-api-key');

      // Surrogate key for targeted invalidation
      const symbol = request.nextUrl.searchParams.get('symbol') || 'all';
      response.headers.set('Surrogate-Key', `rates-${symbol}`);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### Task 2.2: Add Cache Headers in Route Handlers
Update route handlers to set appropriate cache headers.

```typescript
// In src/app/api/v1/rates/route.ts

// Add to successful response:
const headers = new Headers();
headers.set('X-Cache', cachedRate ? 'HIT' : 'MISS');
headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
headers.set('Surrogate-Key', `rates-${symbol}`);

return NextResponse.json(responseData, { headers });
```

### Task 2.3: Disable Edge Cache for Auth Routes
Ensure auth routes are never cached.

```typescript
// In middleware.ts, add exclusion:
if (request.nextUrl.pathname.startsWith('/api/auth/')) {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
```

### Task 2.4: Add Cache Key Generation
Create deterministic cache keys based on query parameters.

```typescript
// Add to middleware.ts
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
```

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/middleware.ts` |
| Modify | `src/app/api/v1/rates/route.ts` |
| Modify | `src/app/api/v1/rates/history/route.ts` |
| Modify | `src/app/api/v1/assets/route.ts` |

---

## Cache-Control Header Reference

| Directive | Purpose |
|-----------|---------|
| `public` | Can be cached by CDN |
| `s-maxage=86400` | Edge cache for 24 hours |
| `stale-while-revalidate=3600` | Serve stale for 1 hour while fetching fresh |
| `no-store` | Never cache (for auth routes) |

---

## Acceptance Criteria

- [ ] Middleware applies Cache-Control headers to API routes
- [ ] Auth routes have `no-store` directive
- [ ] Surrogate-Key header present for cache invalidation
- [ ] Vary header set to prevent cross-user cache pollution
- [ ] Edge cache working in Vercel deployment

---

## Testing

```bash
# Check response headers locally
curl -I "http://localhost:3000/api/v1/rates?symbol=USD"
# Should see: Cache-Control, Surrogate-Key, Vary headers

# After deploying to Vercel
curl -I "https://your-app.vercel.app/api/v1/rates?symbol=USD"
# Should see: x-vercel-cache: HIT on subsequent requests
```

---

## Next Step
Proceed to `03-cache-invalidation.md`
