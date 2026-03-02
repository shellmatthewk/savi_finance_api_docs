import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { createUser, getUserByEmail } from '@/db/queries/users';
import { upsertSubscription } from '@/db/queries/subscriptions';
import { createApiKey } from '@/db/queries/api-keys';
import { signJWT, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RegisterRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
  plan: string;
  apiKey: string;
}

/**
 * Generate a new API key
 * Format: vl_<64 hex chars>
 */
function generateApiKey(): string {
  return `vl_${randomBytes(32).toString('hex')}`;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * POST /api/auth/register
 *
 * Create a new user account with:
 * - Sandbox plan subscription
 * - One API key (shown once in response)
 */
export async function POST(request: Request): Promise<NextResponse<RegisterResponse | { error: string }>> {
  try {
    const body = await request.json() as RegisterRequest;
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await hash(password, 12);

    // Create user
    const user = await createUser({
      email,
      passwordHash,
      plan: 'sandbox',
    });

    // Create sandbox subscription
    await upsertSubscription({
      userId: user.id,
      plan: 'sandbox',
      status: 'active',
    });

    // Generate and store first API key
    const rawApiKey = generateApiKey();
    const keyHash = hashApiKey(rawApiKey);

    await createApiKey({
      userId: user.id,
      keyHash,
      label: 'Default Key',
    });

    // Sign JWT and set session cookie (auto-login after registration)
    const token = await signJWT({ userId: user.id, plan: 'sandbox' });
    await setSessionCookie(token);

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      plan: 'sandbox',
      apiKey: rawApiKey,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
