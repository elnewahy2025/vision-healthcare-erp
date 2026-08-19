import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '@healthcare/shared/errors';
import { getEnv } from '@healthcare/shared/config';
import * as repo from './auth.repository.js';
import type { JwtHelper } from './auth.types.js';

const env = getEnv();

export function getJwtHelper(app: FastifyInstance): JwtHelper {
  return app.jwt as unknown as JwtHelper;
}

// ── CSRF ──

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashCsrfToken(token: string): string {
  return crypto.createHash('sha256').update(token + env.CSRF_SECRET).digest('hex');
}

// ── Account Lockout ──

export async function checkAccountLock(email: string): Promise<void> {
  const result = await repo.checkAccountLock(email);
  if (result.locked) {
    throw new UnauthorizedError(`Account is locked. Try again in ${result.remainingMin} minute(s).`);
  }
}

export async function recordFailedLogin(email: string, tenantId: string | null, ip: string, userAgent: string | null) {
  await repo.recordFailedLogin(email, tenantId, ip, userAgent);
}

export async function recordSuccessfulLogin(email: string, tenantId: string | null, ip: string, userAgent: string | null) {
  await repo.recordSuccessfulLogin(email, tenantId, ip, userAgent);
}

export async function resetFailedLogin(userId: string) {
  await repo.resetFailedLogin(userId);
}

// ── Sessions ──

export async function enforceSessionLimit(userId: string, tenantId: string) {
  const count = await repo.countActiveSessions(userId, tenantId);
  if (count >= env.MAX_CONCURRENT_SESSIONS) {
    await repo.deactivateOldestSessions(userId, tenantId, count - env.MAX_CONCURRENT_SESSIONS + 1);
  }
}

export function summarizeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  let browser = 'Browser';
  if (/edg\/|edge\//i.test(userAgent)) browser = 'Edge';
  else if (/opr\/|opera/i.test(userAgent)) browser = 'Opera';
  else if (/samsungbrowser/i.test(userAgent)) browser = 'Samsung Internet';
  else if (/crios|chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/fxios|firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  const device = /iphone|ipad|ipod/i.test(userAgent) ? 'iOS' : /android/i.test(userAgent) ? 'Android' : 'Desktop';
  return `${browser} \u00b7 ${device}`;
}

export async function createSessionRecord(
  tenantId: string, userId: string, refreshToken: string, ip: string, userAgent: string | null,
) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await repo.createSession({
    tenant_id: tenantId, user_id: userId, token_hash: tokenHash,
    device: summarizeDevice(userAgent),
    ip_address: ip,
    user_agent: userAgent ? userAgent.slice(0, 1000) : null,
    is_active: true,
    expires_at: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });
}

// ── JWT ──

/**
 * Build the access token payload per AUTHORIZATION-SOUND-OF-TRUTH.md §5.
 *
 * JWT contains ONLY identity references:
 *   sub  — user ID (subject)
 *   mid  — active membership ID
 *   sid  — session ID
 *   authz_version — for staleness detection
 *
 * JWT NEVER contains: tenantId, branchId, departmentId, roles, permissions.
 */
export function buildAccessTokenPayload(
  userId: string,
  membershipId: string,
  sessionId: string,
  authzVersion: number,
): Record<string, unknown> {
  return {
    sub: userId,
    mid: membershipId,
    sid: sessionId,
    authz_version: authzVersion,
  };
}

export function generateAccessToken(
  jwt: JwtHelper,
  userId: string,
  membershipId: string,
  sessionId: string,
  authzVersion: number,
): string {
  return jwt.sign(
    buildAccessTokenPayload(userId, membershipId, sessionId, authzVersion),
    { expiresIn: env.ACCESS_TOKEN_EXPIRY },
  );
}

/**
 * Backward-compatible overload for refresh token flow where sessionId
 * is generated fresh and authzVersion is loaded from the membership.
 */
export function generateAccessTokenCompat(
  jwt: JwtHelper,
  userId: string,
  membershipId: string,
  authzVersion: number,
): string {
  const sessionId = crypto.randomUUID();
  return generateAccessToken(jwt, userId, membershipId, sessionId, authzVersion);
}

// ── Verification Token ──

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
