import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getActiveKeysByUser } from '@/db/queries/api-keys';
import { getCurrentUsage } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface UsageTodayResponse {
  plan: string;
  limit: number; // -1 for unlimited
  used: number;
  remaining: number; // -1 for unlimited
}

/**
 * GET /api/usage/today
 *
 * Returns today's API call count across all of the user's active keys
 */
export async function GET(): Promise<NextResponse<UsageTodayResponse | { error: string }>> {
  try {
    const payload = await requireAuth();

    const keys = await getActiveKeysByUser(payload.sub);

    // Sum usage across all active API keys
    let totalUsed = 0;
    for (const key of keys) {
      totalUsed += await getCurrentUsage(key.id);
    }

    const isUnlimited = payload.plan === 'standard';
    const limit = isUnlimited ? -1 : 1000;
    const remaining = isUnlimited ? -1 : Math.max(0, 1000 - totalUsed);

    return NextResponse.json({
      plan: payload.plan,
      limit,
      used: totalUsed,
      remaining,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Usage today error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage data' },
      { status: 500 }
    );
  }
}
