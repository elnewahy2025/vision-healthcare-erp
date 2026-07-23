import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '@healthcare/shared/errors';
import { getEnv } from '@healthcare/shared/config';
import * as repo from './auth.repository.js';
import type { JwtHelper } from './auth.types.js';

const env = getEnv();

export function getJwtHelper(app: FastifyInstance): JwtHelper {
  return app.jwt as unknown as JwtHelper;
}

export async function authenticate(
  app: FastifyInstance,
  request: { server: FastifyInstance; [key: string]: unknown },
  reply: unknown,
): Promise<void> {
  return (app as unknown as { authenticate(req: unknown, rep: unknown): Promise<void> }).authenticate(request, reply);
}

export function extractTenantSettings(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
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

export async function createSessionRecord(
  tenantId: string, userId: string, refreshToken: string, ip: string, userAgent: string | null,
) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await repo.createSession({
    tenant_id: tenantId, user_id: userId, token_hash: tokenHash,
    device: userAgent, ip_address: ip, user_agent: userAgent, is_active: true,
    expires_at: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });
}

// ── JWT ──

export function buildAccessTokenPayload(tenantId: string, userId: string): Record<string, unknown> {
  return { tenantId, userId };
}

export function generateAccessToken(jwt: JwtHelper, tenantId: string, userId: string): string {
  return jwt.sign(buildAccessTokenPayload(tenantId, userId), { expiresIn: env.ACCESS_TOKEN_EXPIRY });
}

// ── Verification Token ──

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
