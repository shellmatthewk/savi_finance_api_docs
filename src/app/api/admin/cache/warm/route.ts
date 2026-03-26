import { NextResponse } from 'next/server';
import { warmRatesCache } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    // Log failed auth attempt
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.warn('[ADMIN_AUDIT] Unauthorized cache warm attempt', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.info('[ADMIN_AUDIT] Cache warm started', {
      userId: authResult.userId,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    const warmedCount = await warmRatesCache();

    console.info('[ADMIN_AUDIT] Cache warm completed', {
      userId: authResult.userId,
      ip: clientIp,
      warmedSymbols: warmedCount,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      warmedSymbols: warmedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.error('[ADMIN_AUDIT] Cache warming failed', {
      userId: authResult.userId,
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cache warming failed',
      },
      { status: 500 }
    );
  }
}
