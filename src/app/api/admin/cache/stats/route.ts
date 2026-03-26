import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
    console.error('Cache stats retrieval failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve cache stats',
      },
      { status: 500 }
    );
  }
}
