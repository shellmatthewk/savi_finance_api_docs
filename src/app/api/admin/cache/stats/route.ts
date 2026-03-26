import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    // Log failed auth attempt
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.warn('[ADMIN_AUDIT] Unauthorized cache stats request', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.info('[ADMIN_AUDIT] Cache stats requested', {
      userId: authResult.userId,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    const stats = await getCacheStats();

    return NextResponse.json({
      success: true,
      cache: {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.error('[ADMIN_AUDIT] Cache stats retrieval failed', {
      userId: authResult.userId,
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve cache stats',
      },
      { status: 500 }
    );
  }
}
