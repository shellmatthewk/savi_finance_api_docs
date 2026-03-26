import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Plan } from '@/db/schema';

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface JWTPayload extends JoseJWTPayload {
  sub: string; // userId
  plan: Plan;
}

/**
 * Get the JWT secret as a Uint8Array for jose
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a JWT token with the given payload
 */
export async function signJWT(payload: { userId: string; plan: Plan }): Promise<string> {
  const secret = getJwtSecret();

  return new SignJWT({ plan: payload.plan })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Set the session cookie with the JWT token
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Get the session cookie value
 */
export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Require authentication middleware
 * Returns the JWT payload if authenticated, or throws a 401 response
 */
export async function requireAuth(): Promise<JWTPayload> {
  const token = await getSessionCookie();

  if (!token) {
    throw NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const payload = await verifyJWT(token);

  if (!payload || !payload.sub) {
    throw NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  return payload;
}

/**
 * Try to get auth payload without throwing
 * Returns null if not authenticated
 */
export async function getAuthPayload(): Promise<JWTPayload | null> {
  const token = await getSessionCookie();
  if (!token) return null;
  return verifyJWT(token);
}

/**
 * Verify admin authentication from request
 * Checks for admin API key in Authorization header
 */
export async function verifyAdminAuth(request: Request): Promise<{ success: boolean; userId?: string }> {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.warn('ADMIN_API_KEY environment variable not set');
    return { success: false };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false };
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (token === adminKey) {
    return { success: true, userId: 'admin' };
  }

  return { success: false };
}
