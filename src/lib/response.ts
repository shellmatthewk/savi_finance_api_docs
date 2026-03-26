import { NextResponse } from 'next/server';

export interface ApiMeta {
  stale?: boolean;
  staleReason?: string;
  dataAge?: number;
  triangulated?: boolean;
  cache?: 'HIT' | 'MISS';
  requestedDate?: string;
  timestamp?: string;
}

export function createSuccessResponse<T>(
  data: T,
  meta: ApiMeta = {},
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { data, meta: { ...meta, timestamp: new Date().toISOString() } },
    {
      status: 200,
      headers: {
        'X-Stale': meta.stale ? 'true' : 'false',
        ...headers,
      },
    }
  );
}
