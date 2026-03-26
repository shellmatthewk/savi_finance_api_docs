# Step 14: Security Audit

## Goal
Review and harden security across all endpoints and infrastructure.

## Prerequisites
- All previous steps completed

---

## Tasks

### Task 14.1: Authentication Security Review

**Checklist:**
- [ ] JWT tokens have appropriate expiration (current: ?)
- [ ] Refresh tokens implemented and stored securely
- [ ] Password hashing uses bcrypt with adequate rounds (12+)
- [ ] Session invalidation on password change
- [ ] OAuth state parameter validated

```typescript
// Review src/lib/auth.ts

// Ensure JWT expiration is reasonable
const JWT_EXPIRY = '1h'; // Not too long
const REFRESH_TOKEN_EXPIRY = '7d';

// Ensure bcrypt rounds
const BCRYPT_ROUNDS = 12; // Minimum 12 for production
```

### Task 14.2: API Key Security

**Checklist:**
- [ ] API keys stored as hashes, not plaintext
- [ ] Key shown only once at creation
- [ ] Revoked keys immediately invalid
- [ ] Rate limiting tied to key

```typescript
// Review src/lib/authenticateApiKey.ts

// Verify hashing
import { createHash } from 'crypto';

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// Never log full API keys
console.log('Key used:', key.substring(0, 8) + '...');
```

### Task 14.3: Rate Limiting for Auth Endpoints
Prevent brute force attacks.

```typescript
// Create src/lib/authRateLimit.ts
import { redis } from './redis';

const AUTH_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts per window
  blockDuration: 60 * 60 * 1000 // 1 hour block after exceeded
};

export async function checkAuthRateLimit(
  identifier: string // IP or email
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `auth:ratelimit:${identifier}`;
  const blockKey = `auth:blocked:${identifier}`;

  // Check if blocked
  const blocked = await redis.get(blockKey);
  if (blocked) {
    const ttl = await redis.ttl(blockKey);
    return { allowed: false, retryAfter: ttl };
  }

  // Increment attempts
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, AUTH_RATE_LIMIT.windowMs / 1000);
  }

  if (attempts > AUTH_RATE_LIMIT.maxAttempts) {
    // Block the identifier
    await redis.setex(
      blockKey,
      AUTH_RATE_LIMIT.blockDuration / 1000,
      '1'
    );
    return { allowed: false, retryAfter: AUTH_RATE_LIMIT.blockDuration / 1000 };
  }

  return { allowed: true };
}

export async function resetAuthRateLimit(identifier: string): Promise<void> {
  await redis.del(`auth:ratelimit:${identifier}`);
}
```

### Task 14.4: Apply Auth Rate Limiting

```typescript
// Update src/app/api/auth/login/route.ts
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/authRateLimit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // Check rate limit
  const rateLimit = await checkAuthRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfter) }
      }
    );
  }

  // ... existing login logic ...

  // On successful login, reset rate limit
  if (loginSuccess) {
    await resetAuthRateLimit(ip);
  }
}
```

### Task 14.5: Input Validation & Sanitization

```typescript
// Create src/lib/validation.ts
import { z } from 'zod';

export const symbolSchema = z.string()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9/\-]+$/, 'Invalid symbol format');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const emailSchema = z.string().email();

export const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number');

// Usage in routes:
const { symbol } = symbolSchema.parse(searchParams.get('symbol'));
```

### Task 14.6: Webhook Security

```typescript
// Review src/app/api/webhooks/stripe/route.ts

// Ensure signature verification
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process verified event...
}
```

### Task 14.7: Security Headers

```typescript
// Update src/middleware.ts

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // Remove server identification
  response.headers.delete('X-Powered-By');

  return response;
}
```

### Task 14.8: Sensitive Data Protection

```typescript
// Create src/lib/logging.ts

// Never log sensitive data
export function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

// Review all console.log statements
// Ensure no passwords, tokens, or keys logged
```

### Task 14.9: Dependency Audit

```bash
# Run npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Update critical packages
npm update
```

### Task 14.10: Environment Variable Security

```bash
# Verify .gitignore includes:
.env
.env.local
.env.production

# Verify no secrets in code
grep -r "sk_live" src/
grep -r "AKIA" src/  # AWS keys
grep -r "ghp_" src/  # GitHub tokens

# Should return no results
```

---

## Security Checklist

| Category | Item | Status |
|----------|------|--------|
| Auth | JWT expiry ≤ 1 hour | [ ] |
| Auth | Refresh token rotation | [ ] |
| Auth | bcrypt rounds ≥ 12 | [ ] |
| Auth | Rate limiting on login | [ ] |
| Auth | Rate limiting on register | [ ] |
| API Keys | Stored as hashes | [ ] |
| API Keys | Shown once only | [ ] |
| Input | All inputs validated | [ ] |
| Input | SQL injection prevented (ORM) | [ ] |
| Headers | Security headers set | [ ] |
| Webhooks | Signature verified | [ ] |
| Logs | No sensitive data logged | [ ] |
| Deps | No critical vulnerabilities | [ ] |
| Env | Secrets not in code | [ ] |
| CORS | Properly configured | [ ] |

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/authRateLimit.ts` |
| Create | `src/lib/validation.ts` |
| Create | `src/lib/logging.ts` |
| Modify | `src/lib/auth.ts` |
| Modify | `src/app/api/auth/login/route.ts` |
| Modify | `src/app/api/auth/register/route.ts` |
| Modify | `src/middleware.ts` |

---

## Acceptance Criteria

- [ ] Auth endpoints rate limited (5 attempts/15 min)
- [ ] Security headers on all responses
- [ ] No sensitive data in logs
- [ ] npm audit shows no critical vulnerabilities
- [ ] Webhook signatures verified
- [ ] Input validation on all endpoints

---

## Next Step
Proceed to `15-documentation.md`
