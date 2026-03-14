import { NextResponse, type NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getUserByEmail, createUser } from '@/db/queries/users';
import { upsertSubscription } from '@/db/queries/subscriptions';
import { createApiKey } from '@/db/queries/api-keys';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { publicEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}

/**
 * Generate a placeholder password hash for OAuth users
 * They can't login with password, only OAuth
 */
function generateOAuthPasswordHash(): string {
  const randomPassword = randomBytes(32).toString('hex');
  return createHash('sha256').update(`oauth:${randomPassword}`).digest('hex');
}

/**
 * Generate a new API key
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
 * GET /api/auth/google/callback
 *
 * Handles Google OAuth callback
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=google_denied`);
  }

  if (!code) {
    return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=config`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${publicEnv.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=token_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Google user info failed:', await userInfoResponse.text());
      return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=userinfo_failed`);
    }

    const googleUser: GoogleUserInfo = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=no_email`);
    }

    // Check if user exists
    let user = await getUserByEmail(googleUser.email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      isNewUser = true;
      user = await createUser({
        email: googleUser.email,
        passwordHash: generateOAuthPasswordHash(),
        plan: 'sandbox',
      });

      // Create sandbox subscription
      await upsertSubscription({
        userId: user.id,
        plan: 'sandbox',
        status: 'active',
      });

      // Generate first API key
      const rawApiKey = generateApiKey();
      const keyHash = hashApiKey(rawApiKey);

      await createApiKey({
        userId: user.id,
        keyHash,
        label: 'Default Key',
      });
    }

    // Sign JWT and set session cookie
    const token = await signJWT({ userId: user.id, plan: user.plan });
    await setSessionCookie(token);

    // Redirect to dashboard
    const redirectUrl = isNewUser
      ? `${publicEnv.APP_URL}/dashboard?welcome=true`
      : `${publicEnv.APP_URL}/dashboard`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${publicEnv.APP_URL}/auth/login?error=unknown`);
  }
}
