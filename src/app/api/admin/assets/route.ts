import { NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { FIAT_ASSETS, CRYPTO_ASSETS, STOCK_ASSETS, METAL_ASSETS } from '@/data/assets';

/**
 * Extract client IP from request headers
 */
function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request);
  const authResult = await verifyAdminAuth(request);

  if (!authResult.success) {
    console.warn('[ADMIN_AUDIT] Unauthorized assets request', {
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.info('[ADMIN_AUDIT] Assets registry requested', {
      userId: authResult.userId,
      ip: clientIp,
      timestamp: new Date().toISOString(),
    });

    const totalAssets =
      FIAT_ASSETS.length +
      CRYPTO_ASSETS.length +
      STOCK_ASSETS.length +
      METAL_ASSETS.length;

    const response = {
      success: true,
      totalAssets,
      breakdown: {
        fiat: FIAT_ASSETS.length,
        crypto: CRYPTO_ASSETS.length,
        stocks: STOCK_ASSETS.length,
        metals: METAL_ASSETS.length,
      },
      assets: {
        fiat: FIAT_ASSETS,
        crypto: CRYPTO_ASSETS,
        stocks: STOCK_ASSETS,
        metals: METAL_ASSETS,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[ADMIN_AUDIT] Assets retrieval failed', {
      userId: authResult.userId,
      ip: clientIp,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve assets',
      },
      { status: 500 }
    );
  }
}
