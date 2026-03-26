import { NextResponse } from 'next/server';
import { warmRatesCache } from '@/lib/cache';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  // Verify admin authentication
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const warmedCount = await warmRatesCache();

    return NextResponse.json({
      success: true,
      warmedSymbols: warmedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache warming failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Cache warming failed',
      },
      { status: 500 }
    );
  }
}
