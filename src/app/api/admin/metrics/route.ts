import { NextResponse } from 'next/server';
import { collectMetrics } from '@/lib/metrics';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.warn('[ADMIN_AUDIT] Unauthorized metrics request', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.info('[ADMIN_AUDIT] Metrics requested', {
      userId: authResult.userId,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    const metrics = await collectMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    console.error('[ADMIN_AUDIT] Metrics retrieval failed', {
      userId: authResult.userId,
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to collect metrics',
      },
      { status: 500 }
    );
  }
}
