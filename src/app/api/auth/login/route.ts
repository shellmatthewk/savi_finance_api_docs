import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { getUserByEmail } from '@/db/queries/users';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/authRateLimit';
import { emailSchema } from '@/lib/validation';
import { createSafeLogger } from '@/lib/logging';

export const dynamic = 'force-dynamic';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  userId: string;
  email: string;
  plan: string;
}

/**
 * POST /api/auth/login
 *
 * Authenticate user and issue JWT session cookie
 */
export async function POST(request: Request): Promise<NextResponse<LoginResponse | { error: string }>> {
  const logger = createSafeLogger('Login');
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';

  try {
    const body = await request.json() as LoginRequest;
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
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check rate limit by IP
    const rateLimit = await checkAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      logger.warn({ message: 'Login rate limit exceeded', ip });
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 3600),
          },
        }
      );
    }

    // Find user by email
    const user = await getUserByEmail(email);
    if (!user) {
      logger.warn({ message: 'Login failed - user not found', email: '[REDACTED]' });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await compare(password, user.passwordHash);
    if (!passwordValid) {
      logger.warn({ message: 'Login failed - invalid password', email: '[REDACTED]' });
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Sign JWT and set session cookie
    const token = await signJWT({
      userId: user.id,
      plan: user.plan,
    });

    await setSessionCookie(token);

    // Reset rate limit on successful login
    await resetAuthRateLimit(ip);

    logger.info({ message: 'Login successful', userId: user.id });

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });
  } catch (error) {
    logger.error(error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
