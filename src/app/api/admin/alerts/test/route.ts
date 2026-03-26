import { NextResponse } from 'next/server';
import { sendAlert } from '@/lib/alerts';
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: Request) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Send test alert
    await sendAlert({
      title: 'Test Alert',
      message: 'This is a test alert from FinFlux API',
      severity: 'info',
      context: {
        triggeredBy: 'Admin test endpoint',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Test alert sent to configured channels',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Test alert error:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test alert',
        details:
          process.env.NODE_ENV !== 'production' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
