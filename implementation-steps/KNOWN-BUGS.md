# Known Bugs and Technical Debt

## Redis Response Caching (Step 01)

### Medium Priority

| Issue | Location | Description | Recommended Fix |
|-------|----------|-------------|-----------------|
| Sequential cache lookups | `src/app/api/v1/rates/route.ts:106-145` | Multi-symbol requests query cache one at a time instead of in parallel | Use `Promise.all()` for parallel cache lookups |
| `KEYS` command | `src/lib/cache.ts:65` | O(N) blocking operation that can slow down Redis | Replace with `SCAN` for production safety |
| Inaccurate cache stats | `src/app/api/v1/rates/route.ts:148-152` | Tracks cache hit/miss per-request, not per-symbol | Track individual symbol cache performance |
| Inconsistent error details | `rates/route.ts` vs `history/route.ts` | Rates endpoint exposes error details, history endpoint doesn't | Standardize error response format |

### Low Priority

| Issue | Location | Description | Recommended Fix |
|-------|----------|-------------|-----------------|
| Unused `prefix` option | `src/lib/cache.ts:8` | `CacheOptions.prefix` defined but never used | Remove or implement the functionality |
| Cache key injection | `src/lib/cache.ts:75-84` | Symbols with special chars (`:`, `*`, `?`) could cause issues with pattern matching | Sanitize or encode cache key components |
| No cache versioning | `src/lib/cache.ts` | Format changes would require manual cache invalidation | Add version prefix to cache keys |
| Stats keys lack TTL | `src/lib/cache.ts:93,104` | Hit/miss counters grow indefinitely | Use time-bucketed keys with TTL |
| No cache stampede protection | `src/app/api/v1/rates/history/route.ts` | Concurrent requests after cache expiry all hit DB | Implement lock/mutex or stale-while-revalidate |

### Enhancements

- Add structured logging instead of `console.error`
- Add monitoring/observability for cache latency and size
- Add integration tests for cache scenarios
- Consider cache warming for frequently accessed symbols
