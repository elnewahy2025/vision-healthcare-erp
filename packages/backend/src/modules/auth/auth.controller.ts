import type { FastifyRequest, FastifyReply } from 'fastify';
import { getCtx } from '../../utils/route-helper.js';
import { sendSuccess } from '../../utils/response.js';
import { UnauthorizedError, ConflictError, ForbiddenError } from '@healthcare/shared/errors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logAudit } from '../../services/audit.js';
import { generateTokenPair, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../../services/refresh-token.js';
import { generateSecret, verifyToken, generateQrCode } from '../../services/totp.js';
import { createAndSendOtp, verifyOtp, incrementOtpAttempt } from '../../services/otp.js';
import { sendEmail } from '../../services/email.js';
import { getEnv } from '@healthcare/shared/config';
import { loadUserPrincipal, uniquePermissionKeys, type Principal } from '../../services/authorization.js';
import { invalidatePrincipal, invalidateUserAuthz } from '../../services/authz-cache.js';
import { db } from '../../core/database.js';
import * as svc from './auth.service.js';
import * as repo from './auth.repository.js';
import {
  registerTenantSchema, loginSchema, mfaVerifySchema,
  logoutSchema, sessionIdSchema, forgotPasswordSchema, resetPasswordSchema,
  changePasswordSchema, verifyEmailSchema, resendVerificationSchema,
  mfaEnableSchema, mfaDisableSchema, otpSendSchema, otpVerifySchema,
  switchMembershipSchema,
} from './auth.schema.js';
const env = getEnv();

function parseRoles(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Canonical authenticated-user payload shared by login, MFA verify, and me().
 * Permissions are the effective grants (roles + direct) derived server-side —
 * the frontend must never receive a stale/legacy shape that hides grants.
 */
function buildUserResponse(user: Record<string, unknown>, principal: Principal | null) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    roles: principal?.roles || parseRoles(user.roles),
    permissions: principal ? uniquePermissionKeys(principal.grants) : [],
    branches: principal?.branches || [],
    employeeType: user.employee_type || 'staff',
    departmentId: principal?.departmentId || user.department_id || null,
    position: user.position || null,
    locale: user.locale || 'en',
    status: user.status,
    mfaEnabled: Boolean(user.mfa_enabled),
    passwordChangedAt: user.password_changed_at || null,
  };
}

/**
 * Load all active memberships for a user, enriched with tenant/branch/dept names.
 */
async function loadMemberships(userId: string) {
  return db('memberships')
    .where({ user_id: userId, status: 'active' })
    .join('tenants', 'memberships.tenant_id', 'tenants.id')
    .leftJoin('branches', 'memberships.branch_id', 'branches.id')
    .leftJoin('departments', 'memberships.department_id', 'departments.id')
    .select(
      'memberships.id', 'memberships.tenant_id', 'memberships.branch_id',
      'memberships.department_id', 'memberships.authz_version',
      'tenants.name as tenant_name', 'tenants.slug as tenant_slug',
      'branches.name as branch_name',
      'departments.name as department_name',
    );
}

/**
 * Format memberships for API response.
 */
function formatMemberships(memberships: Record<string, unknown>[]) {
  return memberships.map((m) => ({
    id: m.id,
    tenant: { id: m.tenant_id, name: m.tenant_name, slug: m.tenant_slug },
    branch: m.branch_id ? { id: m.branch_id, name: m.branch_name } : null,
    department: m.department_id ? { id: m.department_id, name: m.department_name } : null,
    authzVersion: m.authz_version,
  }));
}

// ════════════════════════════════════════════════════════════════════
// REGISTRATION
// ════════════════════════════════════════════════════════════════════

export async function registerTenant(request: FastifyRequest, reply: FastifyReply) {
  const body = registerTenantSchema.parse(request.body);
  if (body.website && body.website.length > 0) {
    return sendSuccess(reply, { message: 'Registration successful. Please verify your email.' }, 'Registration successful', 201);
  }

  const existingSlug = await repo.findTenantBySlug(body.slug);
  if (existingSlug) throw new ConflictError('Organization slug already taken');

  const existingEmail = await repo.findUserByEmail(body.adminEmail);
  if (existingEmail) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(body.adminPassword, env.BCRYPT_ROUNDS);
  const verificationToken = svc.generateVerificationToken();

  const result = await repo.registerTenantWithAdmin({
    name: body.name, slug: body.slug, locale: body.locale,
    settings: JSON.stringify({
      dateFormat: body.locale === 'ar' ? 'DD/MM/YYYY' : 'MM/DD/YYYY',
      currency: 'SAR', timezone: 'Asia/Riyadh',
      theme: { primaryColor: '#0ea5e9', brandName: body.name },
      language: body.locale, direction: body.locale === 'ar' ? 'rtl' : 'ltr',
      features: {},
    }),
    passwordHash, adminEmail: body.adminEmail,
    adminFirstName: body.adminName.split(' ')[0],
    adminLastName: body.adminName.split(' ').slice(1).join(' ') || '',
    verificationToken,
  });

  // Create membership for the admin user
  const tenantId = String(result.tenant.id);
  const userId = String(result.user.id);
  const [membership] = await db('memberships').insert({
    user_id: userId,
    tenant_id: tenantId,
    branch_id: null,
    department_id: null,
    status: 'active',
    authz_version: 1,
  }).returning('*');

  // Set as active membership
  await db('users').where({ id: userId }).update({ active_membership_id: membership.id });

  await logAudit({ tenantId, userId, action: 'tenant.created' });

  try {
    const verifyUrl = `${env.APP_URL}/verify-email?token=${result.verificationToken}`;
    await sendEmail({
      to: body.adminEmail, subject: 'Verify your email — Vision Healthcare',
      html: `<p>Welcome to Vision Healthcare!</p><p>Please verify your email by clicking: <a href="${verifyUrl}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
    });
  } catch { /* best-effort */ }

  return sendSuccess(reply, {
    tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
    message: 'Registration successful. Please verify your email.',
  }, 'Tenant created', 201);
}

// ════════════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════════════

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const body = loginSchema.parse(request.body);
  const ip = request.ip ?? '127.0.0.1';
  const userAgent = (request.headers['user-agent'] as string) || null;

  await svc.checkAccountLock(body.email);

  const tenant = await repo.findTenantBySlug(body.tenantSlug);
  if (!tenant) throw new UnauthorizedError('Invalid organization');

  const user = await repo.findUserByEmailAndTenant(body.email, tenant.id);
  if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
    await svc.recordFailedLogin(body.email, tenant.id, ip, userAgent);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'active') throw new UnauthorizedError('Account is not active');

  await svc.recordSuccessfulLogin(body.email, tenant.id, ip, userAgent);
  await svc.resetFailedLogin(user.id);

  // ── MFA gate ──
  if (user.mfa_enabled) {
    const jwt = svc.getJwtHelper(request.server);
    const partialToken = jwt.sign({ userId: user.id, mfaPending: true }, { expiresIn: '5m' });
    return sendSuccess(reply, { mfaRequired: true, partialToken, userId: user.id });
  }

  // ── Load memberships ──
  const memberships = await loadMemberships(user.id);
  if (memberships.length === 0) {
    throw new UnauthorizedError('No active memberships found');
  }

  // Select active membership (user's stored preference, or first available)
  const activeMembership = memberships.find(
    (m: Record<string, unknown>) => m.id === user.active_membership_id,
  ) || memberships[0];

  const membershipId = String(activeMembership.id);
  const authzVersion = Number(activeMembership.authz_version);

  // ── Create session ──
  const sessionId = crypto.randomUUID();
  const { refreshToken } = await generateTokenPair(user.id, String(activeMembership.tenant_id), ip, userAgent);
  await svc.createSessionRecord(String(activeMembership.tenant_id), user.id, refreshToken, ip, userAgent);
  await svc.enforceSessionLimit(user.id, String(activeMembership.tenant_id));

  // ── Generate JWT with membership reference (NOT tenant data) ──
  const jwt = svc.getJwtHelper(request.server);
  const accessToken = svc.generateAccessToken(jwt, user.id, membershipId, sessionId, authzVersion);

  // ── Load principal from membership ──
  const principal = await loadUserPrincipal(user.id, membershipId);

  // ── Update active membership pointer ──
  await db('users').where({ id: user.id }).update({
    active_membership_id: membershipId,
    last_login_at: new Date(),
  });

  // Invalidate stale cache entries for this user (fresh login)
  await invalidateUserAuthz(user.id);

  await logAudit({ tenantId: String(activeMembership.tenant_id), userId: user.id, action: 'user.login', ipAddress: ip, userAgent });

  // ── CSRF tokens ──
  const csrfToken = svc.generateCsrfToken();
  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
  reply.setCookie('csrf_token', svc.hashCsrfToken(csrfToken), {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });

  // ── Load tenant for response ──
  const tenantData = await repo.findTenantById(String(activeMembership.tenant_id));

  return sendSuccess(reply, {
    accessToken,
    csrfToken,
    expiresIn: 3600,
    activeMembershipId: membershipId,
    memberships: formatMemberships(memberships),
    user: buildUserResponse(user, principal),
    tenant: tenantData ? {
      id: tenantData.id, name: tenantData.name, slug: tenantData.slug,
      locale: tenantData.locale, direction: tenantData.settings?.direction || (tenantData.locale === 'ar' ? 'rtl' : 'ltr'),
      settings: tenantData.settings ?? {},
    } : null,
  });
}

// ════════════════════════════════════════════════════════════════════
// MFA VERIFY
// ════════════════════════════════════════════════════════════════════

export async function mfaVerify(request: FastifyRequest, reply: FastifyReply) {
  const { code, partialToken } = mfaVerifySchema.parse(request.body);
  const ip = request.ip ?? '127.0.0.1';
  const userAgent = (request.headers['user-agent'] as string) || null;

  let decoded: { userId: string; mfaPending: boolean };
  try { decoded = svc.getJwtHelper(request.server).verify(partialToken) as { userId: string; mfaPending: boolean }; }
  catch { throw new UnauthorizedError('Invalid or expired token'); }

  if (!decoded.mfaPending) throw new UnauthorizedError('Invalid token');

  const user = await repo.findUserById(decoded.userId);
  if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not configured');

  const valid = verifyToken(code, user.mfa_secret);
  if (!valid) throw new UnauthorizedError('Invalid MFA code');

  // ── Load memberships ──
  const memberships = await loadMemberships(user.id);
  if (memberships.length === 0) {
    throw new UnauthorizedError('No active memberships found');
  }

  const activeMembership = memberships.find(
    (m: Record<string, unknown>) => m.id === user.active_membership_id,
  ) || memberships[0];

  const membershipId = String(activeMembership.id);
  const authzVersion = Number(activeMembership.authz_version);

  // ── Create session + JWT ──
  const sessionId = crypto.randomUUID();
  const { refreshToken } = await generateTokenPair(user.id, String(activeMembership.tenant_id), ip, userAgent);
  await svc.createSessionRecord(String(activeMembership.tenant_id), user.id, refreshToken, ip, userAgent);
  await svc.enforceSessionLimit(user.id, String(activeMembership.tenant_id));

  const jwt = svc.getJwtHelper(request.server);
  const accessToken = svc.generateAccessToken(jwt, user.id, membershipId, sessionId, authzVersion);

  const principal = await loadUserPrincipal(user.id, membershipId);

  await db('users').where({ id: user.id }).update({ active_membership_id: membershipId });
  await logAudit({ tenantId: String(activeMembership.tenant_id), userId: user.id, action: 'user.login.mfa', ipAddress: ip });

  const csrfToken = svc.generateCsrfToken();
  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
  reply.setCookie('csrf_token', svc.hashCsrfToken(csrfToken), {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });

  const tenantData = await repo.findTenantById(String(activeMembership.tenant_id));

  return sendSuccess(reply, {
    accessToken,
    csrfToken,
    expiresIn: 3600,
    activeMembershipId: membershipId,
    memberships: formatMemberships(memberships),
    user: buildUserResponse(user, principal),
    tenant: tenantData ? {
      id: tenantData.id, name: tenantData.name, slug: tenantData.slug,
      locale: tenantData.locale, direction: tenantData.settings?.direction || (tenantData.locale === 'ar' ? 'rtl' : 'ltr'),
      settings: tenantData.settings ?? {},
    } : null,
  });
}

// ════════════════════════════════════════════════════════════════════
// SWITCH MEMBERSHIP (multi-tenant / multi-branch)
// ════════════════════════════════════════════════════════════════════

export async function switchMembership(request: FastifyRequest, reply: FastifyReply) {
  const { membershipId } = switchMembershipSchema.parse(request.body);
  const { userId } = getCtx(request);

  // 1. Verify user owns this membership and it's active
  const membership = await db('memberships')
    .where({ id: membershipId, user_id: userId, status: 'active' })
    .first();
  if (!membership) throw new ForbiddenError('Membership not found or inactive');

  // 2. Update active membership pointer
  await db('users').where({ id: userId }).update({ active_membership_id: membershipId });

  // 3. Load new principal from the new membership
  const principal = await loadUserPrincipal(userId, membershipId);
  if (!principal) throw new ForbiddenError('Failed to load authorization context');

  // 4. Issue new JWT with new membership
  const sessionId = crypto.randomUUID();
  const jwt = svc.getJwtHelper(request.server);
  const accessToken = svc.generateAccessToken(
    jwt, userId, membershipId, sessionId, principal.authzVersion,
  );

  // 5. Load updated memberships list
  const memberships = await loadMemberships(userId);

  const tenantData = await repo.findTenantById(principal.tenantId);

  // Invalidate old cached principal for this user
  await invalidateUserAuthz(userId);

  await logAudit({
    tenantId: principal.tenantId, userId,
    action: 'user.membership_switched',
    metadata: JSON.stringify({ newMembershipId: membershipId }),
  });

  return sendSuccess(reply, {
    accessToken,
    expiresIn: 3600,
    activeMembershipId: membershipId,
    memberships: formatMemberships(memberships),
    user: buildUserResponse(
      { id: userId, email: principal.userId, first_name: '', last_name: '', roles: principal.roles,
        employee_type: 'staff', department_id: principal.departmentId, position: null,
        locale: principal.locale, status: principal.status, mfa_enabled: false, password_changed_at: null },
      principal,
    ),
    tenant: tenantData ? {
      id: tenantData.id, name: tenantData.name, slug: tenantData.slug,
      locale: tenantData.locale, direction: tenantData.settings?.direction || (tenantData.locale === 'ar' ? 'rtl' : 'ltr'),
      settings: tenantData.settings ?? {},
    } : null,
  });
}

// ════════════════════════════════════════════════════════════════════
// GET MEMBERSHIPS
// ════════════════════════════════════════════════════════════════════

export async function getMemberships(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getCtx(request);
  const memberships = await loadMemberships(userId);

  const user = await repo.findUserById(userId);
  const activeMembershipId = user?.active_membership_id || null;

  return sendSuccess(reply, {
    memberships: formatMemberships(memberships),
    activeMembershipId,
  });
}

// ════════════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ════════════════════════════════════════════════════════════════════

export async function refreshToken(request: FastifyRequest, reply: FastifyReply) {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const bodyToken = typeof body.refreshToken === 'string' ? body.refreshToken : undefined;
  const oldToken = bodyToken || request.cookies?.refresh_token;
  if (!oldToken) throw new UnauthorizedError('Missing refresh token');
  const ip = request.ip ?? '127.0.0.1';
  const userAgent = (request.headers['user-agent'] as string) || null;

  const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
  const oldRecord = await repo.findRefreshTokenByHash(oldTokenHash);
  if (!oldRecord) throw new UnauthorizedError('Invalid refresh token');

  if (oldRecord.user_agent && userAgent && oldRecord.user_agent !== userAgent) {
    await revokeAllUserTokens(oldRecord.user_id, oldRecord.tenant_id);
    await logAudit({ tenantId: oldRecord.tenant_id, userId: oldRecord.user_id, action: 'user.token_agent_mismatch' });
    throw new UnauthorizedError('Session from different device. All sessions revoked for security.');
  }

  if (oldRecord.is_revoked) {
    await revokeAllUserTokens(oldRecord.user_id, oldRecord.tenant_id);
    await logAudit({ tenantId: oldRecord.tenant_id, userId: oldRecord.user_id, action: 'user.token_family_reuse_detected' });
    throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked.');
  }

  const result = await rotateRefreshToken(oldToken, ip, userAgent);
  if (!result) throw new UnauthorizedError('Invalid or expired refresh token');

  const user = await repo.findUserById(oldRecord.user_id);
  if (!user || user.status !== 'active') throw new UnauthorizedError('Account is not active');

  // ── Load user's active membership to get authz_version ──
  const membership = await db('memberships')
    .where({ id: user.active_membership_id, user_id: user.id, status: 'active' })
    .first();

  if (!membership) {
    // Fallback: use first available membership
    const fallbackMembership = await db('memberships')
      .where({ user_id: user.id, status: 'active' })
      .first();
    if (!fallbackMembership) throw new UnauthorizedError('No active membership');
    membership.id = fallbackMembership.id;
    membership.authz_version = fallbackMembership.authz_version;
    membership.tenant_id = fallbackMembership.tenant_id;
  }

  const jwt = svc.getJwtHelper(request.server);
  const accessToken = svc.generateAccessTokenCompat(
    jwt, user.id, String(membership.id), Number(membership.authz_version),
  );

  await repo.updateSessionActivity(user.id, oldRecord.tenant_id, oldTokenHash);
  await logAudit({ tenantId: oldRecord.tenant_id, userId: user.id, action: 'user.token_refresh' });

  const csrfToken = svc.generateCsrfToken();
  reply.setCookie('refresh_token', result.refreshToken, {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
  reply.setCookie('csrf_token', svc.hashCsrfToken(csrfToken), {
    httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict',
    path: '/', maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });

  return sendSuccess(reply, { accessToken, csrfToken, expiresIn: 3600 });
}

// ════════════════════════════════════════════════════════════════════
// LOGOUT
// ════════════════════════════════════════════════════════════════════

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const bodyToken = typeof body.refreshToken === 'string' ? body.refreshToken : undefined;
  const token = bodyToken || request.cookies?.refresh_token;
  const ip = request.ip ?? '127.0.0.1';

  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await repo.findRefreshTokenByHash(tokenHash);
    if (record) {
      await revokeRefreshToken(token);
      await repo.deactivateSessionByIp(record.user_id, record.tenant_id, ip);
      await logAudit({ tenantId: record.tenant_id, userId: record.user_id, action: 'user.logout' });
    }
  }

  reply.clearCookie('refresh_token', { path: '/' });
  reply.clearCookie('csrf_token', { path: '/' });
  return sendSuccess(reply, { message: 'Logged out successfully' });
}

// ════════════════════════════════════════════════════════════════════
// ME (current user)
// ════════════════════════════════════════════════════════════════════

export async function me(request: FastifyRequest, reply: FastifyReply) {
  const { userId, principal } = getCtx(request);
  const user = await repo.findUserByIdAndTenant(userId, principal.tenantId);
  if (!user) throw new UnauthorizedError('User not found');
  const tenant = await repo.findTenantById(principal.tenantId);
  return sendSuccess(reply, {
    user: buildUserResponse(user, principal),
    tenant: tenant ? {
      id: tenant.id, name: tenant.name, slug: tenant.slug,
      locale: tenant.locale, direction: tenant.settings?.direction || (tenant.locale === 'ar' ? 'rtl' : 'ltr'),
      settings: tenant.settings ?? {},
    } : null,
  });
}

// ════════════════════════════════════════════════════════════════════
// SESSIONS
// ════════════════════════════════════════════════════════════════════

export async function listSessions(request: FastifyRequest, reply: FastifyReply) {
  const { userId, tenantId } = getCtx(request);
  const sessions = await repo.findActiveSessions(userId, tenantId);
  return sendSuccess(reply, sessions.map((s: Record<string, unknown>) => ({
    id: s.id, device: s.device, ipAddress: s.ip_address, userAgent: s.user_agent,
    lastActivityAt: s.last_activity_at, createdAt: s.created_at,
  })));
}

export async function revokeSession(request: FastifyRequest, reply: FastifyReply) {
  const { sessionId } = sessionIdSchema.parse(request.params);
  const { userId, tenantId } = getCtx(request);
  await repo.deactivateSession(sessionId, userId, tenantId);
  await logAudit({ tenantId, userId, action: 'user.session_revoked' });
  return sendSuccess(reply, { message: 'Session revoked' });
}

// ════════════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT
// ════════════════════════════════════════════════════════════════════

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { email, tenantSlug } = forgotPasswordSchema.parse(request.body);
  const tenant = await repo.findTenantBySlug(tenantSlug);
  if (!tenant) throw new UnauthorizedError('Invalid organization');
  const user = await repo.findUserByEmailAndTenant(email, tenant.id);
  if (!user) return sendSuccess(reply, { message: 'If an account exists, a reset email has been sent.' });
  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  await repo.createPasswordReset({
    tenant_id: tenant.id, user_id: user.id, token_hash: tokenHash,
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  });
  try {
    await sendEmail({
      to: user.email, subject: 'Reset your password — Vision Healthcare',
      html: `<p>Reset your password: <a href="${env.APP_URL}/reset-password?token=${resetToken}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
    });
  } catch { /* best-effort */ }
  return sendSuccess(reply, { message: 'If an account exists, a reset email has been sent.' });
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { token, password } = resetPasswordSchema.parse(request.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await repo.findPasswordReset(tokenHash);
  if (!record) throw new UnauthorizedError('Invalid or expired reset token');
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  await repo.updateUser(record.user_id, { password_hash: passwordHash, password_changed_at: new Date() });
  await repo.deletePasswordReset(record.id);
  await logAudit({ tenantId: record.tenant_id, userId: record.user_id, action: 'user.password_reset' });
  return sendSuccess(reply, { message: 'Password reset successfully' });
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);
  const { userId, tenantId } = getCtx(request);
  const user = await repo.findUserByIdAndTenant(userId, tenantId);
  if (!user) throw new UnauthorizedError('User not found');
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new UnauthorizedError('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await repo.updateUser(userId, { password_hash: passwordHash, password_changed_at: new Date() });
  await logAudit({ tenantId, userId, action: 'user.password_changed' });
  return sendSuccess(reply, { message: 'Password changed successfully' });
}

// ════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ════════════════════════════════════════════════════════════════════

export async function verifyEmail(request: FastifyRequest, reply: FastifyReply) {
  const { token } = verifyEmailSchema.parse(request.body);
  const user = await repo.findUserByVerificationToken(token);
  if (!user) throw new UnauthorizedError('Invalid or expired verification token');
  await repo.updateUser(user.id, { email_verified: true, email_verification_token: null });
  await logAudit({ tenantId: user.tenant_id, userId: user.id, action: 'user.email_verified' });
  return sendSuccess(reply, { message: 'Email verified successfully' });
}

export async function resendVerification(request: FastifyRequest, reply: FastifyReply) {
  const { email, tenantSlug } = resendVerificationSchema.parse(request.body);
  const tenant = await repo.findTenantBySlug(tenantSlug);
  if (!tenant) throw new UnauthorizedError('Invalid organization');
  const user = await repo.findUserByEmailAndTenant(email, tenant.id);
  if (!user || user.email_verified) return sendSuccess(reply, { message: 'If an account exists, a verification email has been sent.' });
  const verificationToken = svc.generateVerificationToken();
  await repo.updateUser(user.id, { email_verification_token: verificationToken });
  try {
    await sendEmail({ to: user.email, subject: 'Verify your email — Vision Healthcare',
      html: `<p>Please verify your email: <a href="${env.APP_URL}/verify-email?token=${verificationToken}">Verify Email</a></p>` });
  } catch { /* best-effort */ }
  return sendSuccess(reply, { message: 'If an account exists, a verification email has been sent.' });
}

// ════════════════════════════════════════════════════════════════════
// MFA MANAGEMENT
// ════════════════════════════════════════════════════════════════════

export async function mfaSetup(request: FastifyRequest, reply: FastifyReply) {
  const { userId } = getCtx(request);
  const { secret, otpauthUrl } = generateSecret();
  const qrCode = await generateQrCode(otpauthUrl);
  await repo.updateUser(userId, { mfa_secret: secret });
  return sendSuccess(reply, { secret, qrCode, otpauthUrl });
}

export async function mfaEnable(request: FastifyRequest, reply: FastifyReply) {
  const { code } = mfaEnableSchema.parse(request.body);
  const { userId, tenantId } = getCtx(request);
  const user = await repo.findUserById(userId);
  if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not set up');
  const valid = verifyToken(code, user.mfa_secret);
  if (!valid) throw new UnauthorizedError('Invalid code. Please try again.');
  await repo.updateUser(userId, { mfa_enabled: true });
  const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
  await repo.storeRecoveryCodes(tenantId, userId, recoveryCodes);
  await logAudit({ tenantId, userId, action: 'user.mfa_enabled' });
  return sendSuccess(reply, { message: 'Two-factor authentication enabled. Store these recovery codes securely.', recoveryCodes });
}

export async function mfaDisable(request: FastifyRequest, reply: FastifyReply) {
  const { code } = mfaDisableSchema.parse(request.body);
  const { userId, tenantId } = getCtx(request);
  const user = await repo.findUserById(userId);
  if (!user || !user.mfa_enabled) throw new UnauthorizedError('MFA is not enabled');
  const valid = verifyToken(code, user.mfa_secret!);
  if (!valid) throw new UnauthorizedError('Invalid code.');
  await repo.updateUser(userId, { mfa_enabled: false, mfa_secret: null });
  await logAudit({ tenantId, userId, action: 'user.mfa_disabled' });
  return sendSuccess(reply, { message: 'Two-factor authentication disabled.' });
}

// ════════════════════════════════════════════════════════════════════
// OTP
// ════════════════════════════════════════════════════════════════════

export async function sendOtp(request: FastifyRequest, reply: FastifyReply) {
  const { identifier, tenantSlug } = otpSendSchema.parse(request.body);
  const tenant = await repo.findTenantBySlug(tenantSlug);
  if (!tenant) throw new UnauthorizedError('Invalid organization');
  const sent = await createAndSendOtp(tenant.id, identifier, 'verify_phone');
  if (!sent) throw new UnauthorizedError('Failed to send OTP');
  return sendSuccess(reply, { message: 'OTP sent successfully.' });
}

export async function verifyOtpHandler(request: FastifyRequest, reply: FastifyReply) {
  const { identifier, code, purpose } = otpVerifySchema.parse(request.body);
  const valid = await verifyOtp(identifier, code, purpose || 'verify_phone');
  if (!valid) { await incrementOtpAttempt(identifier, code, purpose || 'verify_phone'); throw new UnauthorizedError('Invalid or expired OTP code.'); }
  return sendSuccess(reply, { message: 'OTP verified successfully.' });
}

// ════════════════════════════════════════════════════════════════════
// CSRF VALIDATION MIDDLEWARE
// ════════════════════════════════════════════════════════════════════

export async function csrfValidation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const url = request.url;
  if (
    url.includes('/auth/login') || url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/forgot-password') || url.includes('/auth/verify-email') ||
    url.includes('/auth/reset-password') || url.includes('/auth/resend-verification') ||
    url.includes('/auth/otp/') ||
    url.includes('/portal/request-access') || url.includes('/portal/otp/request') ||
    url.includes('/portal/verify') ||
    url.includes('/booking/request') ||
    (url.includes('/tenants') && method === 'POST')
  ) return;

  const csrfHeader = request.headers["x-csrf-token"];
  const cookies = request.cookies;
  const csrfCookie = cookies?.csrf_token;
  if (!csrfHeader || !csrfCookie) { reply.code(403).send({ success: false, error: "CSRF token missing" }); return; }

  const expected = crypto.createHash("sha256").update(csrfHeader + env.CSRF_SECRET).digest("hex");
  if (expected !== csrfCookie) { reply.code(403).send({ success: false, error: "CSRF token invalid" }); return; }
}
