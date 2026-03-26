import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { createUser, getUserByEmail } from '@/db/queries/users';
import { upsertSubscription } from '@/db/queries/subscriptions';
import { createApiKey } from '@/db/queries/api-keys';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/authRateLimit';
import { emailSchema, passwordSchema } from '@/lib/validation';
import { createSafeLogger } from '@/lib/logging';

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
  const logger = createSafeLogger('Register');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';

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

    // Validate email format
    try {
      emailSchema.parse(email);
    } catch (_error) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    try {
      passwordSchema.parse(password);
    } catch (error) {
      let message = 'Password does not meet requirements';
      if (error instanceof Error && 'errors' in error) {
        const zodError = error as { errors?: Array<{ message?: string }> };
        message = zodError.errors?.[0]?.message || message;
      }
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    // Check rate limit by IP
    const rateLimit = await checkAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      logger.warn({ message: 'Register rate limit exceeded', ip });
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 3600),
          },
        }
      );
    }

    // Check if email already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      logger.warn({ message: 'Registration failed - email already exists', email: '[REDACTED]' });
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

    // Reset rate limit on successful registration
    await resetAuthRateLimit(ip);

    logger.info({ message: 'Registration successful', userId: user.id });

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      plan: 'sandbox',
      apiKey: rawApiKey,
    }, { status: 201 });
  } catch (error) {
    logger.error(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create account', details: errorMessage },
      { status: 500 }
    );
  }
}
