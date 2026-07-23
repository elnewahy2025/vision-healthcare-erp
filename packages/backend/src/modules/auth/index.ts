import { getCtx, getTenantId } from "../../utils/route-helper.js";
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit, refreshRateLimit } from '../../utils/rate-limiter.js';
import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { UnauthorizedError, ConflictError } from '@healthcare/shared/errors';
import type { User, Role } from '@healthcare/shared/types';
import { generateSecret, verifyToken, generateQrCode } from '../../services/totp.js';
import { createAndSendOtp, verifyOtp, incrementOtpAttempt } from '../../services/otp.js';
import { sendEmail } from '../../services/email.js';
import { logAudit } from '../../services/audit.js';
import { generateTokenPair, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../../services/refresh-token.js';
import { getEnv } from '@healthcare/shared/config';

const env = getEnv();

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,30}$/;

// ── Password complexity regex: uppercase + lowercase + digit + special char ──
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

interface TenantSettings {
  direction?: string;
  dateFormat?: string;
  currency?: string;
  timezone?: string;
  theme?: Record<string, unknown>;
}

interface MfaPartialPayload {
  tenantId: string;
  userId: string;
  mfaPending: boolean;
}

interface JwtHelper {
  sign(payload: Record<string, unknown>, opts: { expiresIn: string }): string;
  verify(token: string): Record<string, unknown>;
}

function getJwtHelper(app: FastifyInstance): JwtHelper {
  return app.jwt as unknown as JwtHelper;
}

function authenticate(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  return (app as unknown as { authenticate(req: FastifyRequest, rep: FastifyReply): Promise<void> }).authenticate(request, reply);
}

function extractTenantSettings(raw: unknown): TenantSettings {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as TenantSettings;
  }
  return {};
}

// ── CSRF token helpers ──
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashCsrfToken(token: string): string {
  return crypto.createHash('sha256').update(token + env.CSRF_SECRET).digest('hex');
}

// ── Account lockout helpers ──
async function recordFailedLogin(
  email: string,
  tenantId: string | null,
  ipAddress: string,
  userAgent: string | null,
): Promise<void> {
  // Record in login_attempts for IP tracking
  await db('login_attempts').insert({
    ip_address: ipAddress,
    email,
    tenant_id: tenantId,
    success: false,
    user_agent: userAgent,
  });

  // Increment failed attempts on user account
  const user = await db('users').where({ email }).first();
  if (user) {
    const attempts = (user.failed_login_attempts || 0) + 1;
    const update: Record<string, unknown> = { failed_login_attempts: attempts };
    if (attempts >= env.MAX_LOGIN_ATTEMPTS) {
      update.locked_until = new Date(Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000);
    }
    await db('users').where({ id: user.id }).update(update);
  }
}

async function checkAccountLock(email: string): Promise<void> {
  const user = await db('users').where({ email }).first();
  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMs = new Date(user.locked_until).getTime() - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new UnauthorizedError(`Account is locked. Try again in ${remainingMin} minute(s).`);
  }
}

async function resetFailedLogin(userId: string): Promise<void> {
  await db('users').where({ id: userId }).update({
    failed_login_attempts: 0,
    locked_until: null,
  });
}

async function recordSuccessfulLogin(
  email: string,
  tenantId: string | null,
  ipAddress: string,
  userAgent: string | null,
): Promise<void> {
  await db('login_attempts').insert({
    ip_address: ipAddress,
    email,
    tenant_id: tenantId,
    success: true,
    user_agent: userAgent,
  });
}

// ── Session management ──
async function enforceSessionLimit(
  userId: string,
  tenantId: string,
): Promise<void> {
  const activeCount = await db('user_sessions')
    .where({ user_id: userId, tenant_id: tenantId, is_active: true })
    .count('id as count')
    .first();

  const count = Number(activeCount?.count || 0);
  if (count >= env.MAX_CONCURRENT_SESSIONS) {
    // Deactivate oldest sessions
    const oldest = await db('user_sessions')
      .where({ user_id: userId, tenant_id: tenantId, is_active: true })
      .orderBy('last_activity_at', 'asc')
      .limit(count - env.MAX_CONCURRENT_SESSIONS + 1);

    if (oldest.length > 0) {
      const ids = oldest.map((s: Record<string, unknown>) => s.id);
      await db('user_sessions').whereIn('id', ids).update({ is_active: false });
    }
  }
}

// ── JWT payload — minimal, no permissions/roles ──
function buildAccessTokenPayload(
  tenantId: string,
  userId: string,
): Record<string, unknown> {
  return {
    tenantId,
    userId,
    // permissions and roles are NOT included — fetched from DB on demand
  };
}


// ── CSRF validation middleware for state-changing requests ──
function csrfValidation(request: FastifyRequest, reply: FastifyReply): void {
  // Skip CSRF for GET/HEAD/OPTIONS (safe methods)
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  // Skip CSRF for public endpoints (login, register, refresh, forgot-password)
  const url = request.url;
  if (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/otp/') ||
    url.includes('/tenants') && method === 'POST'
  ) {
    return;
  }

  // Validate CSRF token from header against cookie
  const csrfHeader = request.headers['x-csrf-token'];
  const cookies = request.cookies;
  const csrfCookie = cookies?.csrf_token;

  if (!csrfHeader || !csrfCookie) {
    reply.code(403).send({ success: false, error: 'CSRF token missing' });
    return;
  }

  const expected = crypto.createHash('sha256').update(csrfHeader + env.CSRF_SECRET).digest('hex');
  if (expected !== csrfCookie) {
    reply.code(403).send({ success: false, error: 'CSRF token invalid' });
    return;
  }
}

// ── Email verification ──
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerAuthModule(app: FastifyInstance) {

  // ===================== REGISTER TENANT =====================
  app.post('/api/v1/tenants', { preHandler: [registerRateLimit] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      name: z.string().min(2).max(200),
      slug: z.string().regex(TENANT_SLUG_REGEX, '3-30 chars, lowercase, hyphens only'),
      locale: z.enum(['ar', 'en']).default('en'),
      adminEmail: z.string().email(),
      adminPassword: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
      adminName: z.string().min(2),
      // Honeypot field — must be empty for humans
      website: z.string().max(0).optional().default(''),
    });

    const body = schema.parse(request.body);

    // Bot detection: honeypot field should be empty
    if (body.website && body.website.length > 0) {
      // Silently reject bot submissions
      return sendSuccess(reply, { message: 'Registration successful. Please verify your email.' }, 'Registration successful', 201);
    }

    const existingSlug = await db('tenants').where({ slug: body.slug }).first();
    if (existingSlug) throw new ConflictError('Organization slug already taken');

    const existingEmail = await db('users').join('tenants', 'users.tenant_id', 'tenants.id')
      .where({ 'users.email': body.adminEmail }).first();
    if (existingEmail) throw new ConflictError('Email already registered');

    const result = await db.transaction(async (trx) => {
      const [tenant] = await trx('tenants').insert({
        name: body.name, slug: body.slug, locale: body.locale,
        settings: JSON.stringify({
          dateFormat: body.locale === 'ar' ? 'DD/MM/YYYY' : 'MM/DD/YYYY',
          currency: 'SAR', timezone: 'Asia/Riyadh',
          theme: { primaryColor: '#0ea5e9', brandName: body.name },
          language: body.locale, direction: body.locale === 'ar' ? 'rtl' : 'ltr',
          features: {},
        }),
        status: 'active',
      }).returning('*');

      const passwordHash = await bcrypt.hash(body.adminPassword, env.BCRYPT_ROUNDS);

      const [adminRole] = await trx('roles').insert({
        tenant_id: tenant.id, name: 'Super Admin', slug: 'super_admin',
        description: 'Full system access',
        permissions: JSON.stringify([
          'patient:read', 'patient:write', 'patient:delete',
          'appointment:read', 'appointment:write', 'appointment:delete',
          'emr:read', 'emr:write', 'emr:delete',
          'billing:read', 'billing:write', 'billing:delete',
          'admin:access', 'admin:users', 'admin:settings',
          'settings:read', 'settings:write', 'audit:read',
        ]),
        is_system: true,
      }).returning('*');

      // Generate email verification token
      const verificationToken = generateVerificationToken();

      const [user] = await trx('users').insert({
        tenant_id: tenant.id, email: body.adminEmail, password_hash: passwordHash,
        first_name: body.adminName.split(' ')[0],
        last_name: body.adminName.split(' ').slice(1).join(' ') || '',
        role_id: adminRole.id,
        roles: JSON.stringify(['super_admin']),
        permissions: JSON.stringify([
          'patient:read', 'patient:write', 'patient:delete',
          'appointment:read', 'appointment:write', 'appointment:delete',
          'emr:read', 'emr:write', 'emr:delete',
          'billing:read', 'billing:write', 'billing:delete',
          'admin:access', 'admin:users', 'admin:settings',
          'settings:read', 'settings:write', 'audit:read',
        ]),
        locale: body.locale, status: 'active',
        mfa_enabled: false,
        email_verification_token: verificationToken,
        email_verified: false,
      }).returning('*');

      return { tenant, user, adminRole, verificationToken };
    });

    await logAudit({ tenantId: result.tenant.id, userId: result.user.id, action: 'tenant.created' });

    // Send verification email (best-effort)
    try {
      const verifyUrl = `${env.APP_URL}/verify-email?token=${result.verificationToken}`;
      await sendEmail({
        to: body.adminEmail,
        subject: 'Verify your email — Vision Healthcare',
        html: `<p>Welcome to Vision Healthcare!</p><p>Please verify your email by clicking: <a href="${verifyUrl}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
      });
    } catch {
      // Email sending is best-effort — don't fail registration
    }

    return sendSuccess(reply, {
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      message: 'Registration successful. Please verify your email.',
    }, 'Tenant created', 201);
  });

  // ===================== LOGIN =====================
  app.post('/api/v1/auth/login', { preHandler: [loginRateLimit] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);
    const ip = request.ip ?? '127.0.0.1';
    const userAgent = request.headers['user-agent'] || null;

    // Check account lockout
    await checkAccountLock(body.email);

    const tenant = await db('tenants').where({ slug: body.tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const user = await db('users')
      .where({ email: body.email, tenant_id: tenant.id })
      .first();

    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      await recordFailedLogin(body.email, tenant.id, ip, userAgent);
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    // Record successful login and reset failed attempts
    await recordSuccessfulLogin(body.email, tenant.id, ip, userAgent);
    await resetFailedLogin(user.id);

    // Handle MFA
    if (user.mfa_enabled) {
      const jwt = getJwtHelper(app);
      const partialToken = jwt.sign({
        tenantId: tenant.id, userId: user.id, mfaPending: true,
      }, { expiresIn: '5m' });
      return sendSuccess(reply, { mfaRequired: true, partialToken, userId: user.id });
    }

    // Generate access token — minimal payload (no permissions/roles)
    const jwt = getJwtHelper(app);
    const accessToken = jwt.sign(
      buildAccessTokenPayload(tenant.id, user.id),
      { expiresIn: env.ACCESS_TOKEN_EXPIRY },
    );

    const { refreshToken } = await generateTokenPair(
      user.id, tenant.id, ip, userAgent,
    );

    // Enforce concurrent session limit
    await enforceSessionLimit(user.id, tenant.id);

    // Create session record
    await db('user_sessions').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      device: userAgent,
      ip_address: ip,
      user_agent: userAgent,
      is_active: true,
      expires_at: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.login', ipAddress: ip, userAgent });

    // CSRF token for state-changing requests
    const csrfToken = generateCsrfToken();

    // Set refresh token as HttpOnly cookie (not accessible via JavaScript)
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    });

    reply.setCookie('csrf_token', hashCsrfToken(csrfToken), {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });

    return sendSuccess(reply, {
      accessToken,
      csrfToken,
      expiresIn: 3600,
      user: {
        id: user.id, email: user.email,
        firstName: user.first_name, lastName: user.last_name,
        roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles,
        locale: user.locale,
      },
    });
  });

  // ===================== MFA VERIFY =====================
  app.post('/api/v1/auth/mfa/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, partialToken } = z.object({ code: z.string().length(6), partialToken: z.string() }).parse(request.body);
    const ip = request.ip ?? '127.0.0.1';
    const userAgent = request.headers['user-agent'] || null;

    let decoded: MfaPartialPayload;
    try {
      decoded = getJwtHelper(app).verify(partialToken) as MfaPartialPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    if (!decoded.mfaPending) throw new UnauthorizedError('Invalid token');

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not configured');

    const valid = verifyToken(code, user.mfa_secret);
    if (!valid) throw new UnauthorizedError('Invalid MFA code');

    const tenant = await db('tenants').where({ id: decoded.tenantId }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const jwt = getJwtHelper(app);
    const accessToken = jwt.sign(
      buildAccessTokenPayload(tenant.id, user.id),
      { expiresIn: env.ACCESS_TOKEN_EXPIRY },
    );

    const { refreshToken } = await generateTokenPair(user.id, tenant.id, ip, userAgent);

    await enforceSessionLimit(user.id, tenant.id);

    await db('user_sessions').insert({
      tenant_id: tenant.id,
      user_id: user.id,
      token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      device: userAgent,
      ip_address: ip,
      user_agent: userAgent,
      is_active: true,
      expires_at: new Date(Date.now() + env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.login.mfa', ipAddress: ip });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    });

    return sendSuccess(reply, {
      accessToken, expiresIn: 3600,
      user: {
        id: user.id, email: user.email,
        firstName: user.first_name, lastName: user.last_name,
        roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles,
        locale: user.locale,
      },
    });
  });

  // ===================== REFRESH TOKEN =====================
  app.post('/api/v1/auth/refresh', { preHandler: [refreshRateLimit] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(request.body);
    const ip = request.ip ?? '127.0.0.1';
    const userAgent = request.headers['user-agent'] || null;

    const result = await rotateRefreshToken(refreshToken, ip, userAgent);
    if (!result) throw new UnauthorizedError('Invalid or expired refresh token');

    // Look up user to get tenant info and verify they're still active
    const tokenRecord = await db('refresh_tokens')
      .where({ token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex') })
      .first();

    // Validate user agent matches (token binding)
    if (tokenRecord && tokenRecord.user_agent && userAgent && tokenRecord.user_agent !== userAgent) {
      // User agent mismatch — possible token theft, revoke all tokens
      await revokeAllUserTokens(tokenRecord.user_id, tokenRecord.tenant_id);
      await logAudit({ tenantId: tokenRecord.tenant_id, userId: tokenRecord.user_id, action: 'user.token_agent_mismatch' });
      throw new UnauthorizedError('Session from different device. All sessions revoked for security.');
    }

    // If the old token was revoked (family reuse detected), revoke ALL tokens for this family
    if (!tokenRecord || tokenRecord.is_revoked) {
      // This is a stolen token reuse — revoke all tokens for this user
      if (tokenRecord) {
        await revokeAllUserTokens(tokenRecord.user_id, tokenRecord.tenant_id);
        await logAudit({ tenantId: tokenRecord.tenant_id, userId: tokenRecord.user_id, action: 'user.token_family_reuse_detected' });
      }
      throw new UnauthorizedError('Refresh token reuse detected. All sessions revoked.');
    }

    const user = await db('users').where({ id: tokenRecord.user_id }).first();
    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Account is not active');
    }

    const jwt = getJwtHelper(app);
    const accessToken = jwt.sign(
      buildAccessTokenPayload(tokenRecord.tenant_id, user.id),
      { expiresIn: env.ACCESS_TOKEN_EXPIRY },
    );

    await logAudit({ tenantId: tokenRecord.tenant_id, userId: user.id, action: 'user.token_refresh' });

    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
      maxAge: env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
    });

    return sendSuccess(reply, { accessToken, expiresIn: 3600 });
  });

  // ===================== LOGOUT =====================
  app.post('/api/v1/auth/logout', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(request.body || {});
    const { userId, tenantId } = getCtx(request);

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    // Deactivate current session
    const ip = request.ip ?? '127.0.0.1';
    await db('user_sessions')
      .where({ user_id: userId, tenant_id: tenantId, ip_address: ip, is_active: true })
      .update({ is_active: false });

    await logAudit({ tenantId, userId, action: 'user.logout' });

    reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    reply.clearCookie('csrf_token', { path: '/' });

    return sendSuccess(reply, { message: 'Logged out successfully' });
  });

  // ===================== ME =====================
  app.get('/api/v1/auth/me', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId, tenant_id: tenantId }).first();
    if (!user) throw new UnauthorizedError('User not found');

    const tenant = await db('tenants').where({ id: tenantId }).first();

    return sendSuccess(reply, {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles,
      permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
      locale: user.locale || 'en',
      status: user.status,
      mfaEnabled: user.mfa_enabled,
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug } : null,
    });
  });

  // ===================== ACTIVE SESSIONS =====================
  app.get('/api/v1/auth/sessions', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, tenantId } = getCtx(request);

    const sessions = await db('user_sessions')
      .where({ user_id: userId, tenant_id: tenantId, is_active: true })
      .select('id', 'device', 'ip_address', 'user_agent', 'last_activity_at', 'created_at')
      .orderBy('last_activity_at', 'desc');

    return sendSuccess(reply, sessions.map((s: Record<string, unknown>) => ({
      id: s.id,
      device: s.device,
      ipAddress: s.ip_address,
      userAgent: s.user_agent,
      lastActivityAt: s.last_activity_at,
      createdAt: s.created_at,
    })));
  });

  // ===================== REVOKE SPECIFIC SESSION =====================
  app.delete('/api/v1/auth/sessions/:sessionId', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(request.params);
    const { userId, tenantId } = getCtx(request);

    await db('user_sessions')
      .where({ id: sessionId, user_id: userId, tenant_id: tenantId })
      .update({ is_active: false });

    await logAudit({ tenantId, userId, action: 'user.session_revoked' });

    return sendSuccess(reply, { message: 'Session revoked' });
  });

  // ===================== FORGOT PASSWORD =====================
  app.post('/api/v1/auth/forgot-password', { preHandler: [forgotPasswordRateLimit] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, tenantSlug } = z.object({ email: z.string().email(), tenantSlug: z.string() }).parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const user = await db('users').where({ email, tenant_id: tenant.id }).first();
    // Always return success to prevent email enumeration
    if (!user) return sendSuccess(reply, { message: 'If an account exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    await db('password_resets').insert({
      user_id: user.id, tenant_id: tenant.id,
      token_hash: resetHash,
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const resetLink = `${env.APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset — Vision Healthcare',
      html: `<p>You requested a password reset.</p><p>Click: <a href="${resetLink}">Reset Password</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    });

    await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.forgot_password' });

    return sendSuccess(reply, { message: 'If an account exists, a reset link has been sent.' });
  });

  // ===================== RESET PASSWORD =====================
  app.post('/api/v1/auth/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, password } = z.object({
      token: z.string(),
      password: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
    }).parse(request.body);

    const resetHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await db('password_resets')
      .where({ token_hash: resetHash })
      .where('expires_at', '>', new Date())
      .first();

    if (!reset) throw new UnauthorizedError('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await db('users').where({ id: reset.user_id }).update({
      password_hash: passwordHash,
      password_changed_at: new Date(),
    });

    // Invalidate reset token
    await db('password_resets').where({ id: reset.id }).delete();

    // Revoke all refresh tokens — force re-login everywhere
    await revokeAllUserTokens(reset.user_id, reset.tenant_id);

    await logAudit({ tenantId: reset.tenant_id, userId: reset.user_id, action: 'user.reset_password' });

    return sendSuccess(reply, { message: 'Password reset successfully. Please log in again.' });
  });

  // ===================== CHANGE PASSWORD =====================
  app.post('/api/v1/auth/change-password', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().regex(PASSWORD_COMPLEXITY_REGEX, 'Password must be at least 8 characters with uppercase, lowercase, digit, and special character'),
    }).parse(request.body);
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId }).first();
    if (!user) throw new UnauthorizedError('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    // Prevent reuse of current password
    if (await bcrypt.compare(newPassword, user.password_hash)) {
      throw new UnauthorizedError('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await db('users').where({ id: userId }).update({
      password_hash: passwordHash,
      password_changed_at: new Date(),
    });

    // Revoke ALL refresh tokens — force re-login on all devices
    await revokeAllUserTokens(userId, tenantId);

    await logAudit({ tenantId, userId, action: 'user.change_password' });

    return sendSuccess(reply, { message: 'Password changed successfully. Please log in again on all devices.' });
  });

  // ===================== EMAIL VERIFICATION =====================
  app.post('/api/v1/auth/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);

    const user = await db('users').where({ email_verification_token: token }).first();
    if (!user) throw new UnauthorizedError('Invalid verification token');

    await db('users').where({ id: user.id }).update({
      email_verified: true,
      email_verified_at: new Date(),
      email_verification_token: null,
    });

    await logAudit({ tenantId: user.tenant_id, userId: user.id, action: 'user.email_verified' });

    return sendSuccess(reply, { message: 'Email verified successfully.' });
  });

  // ===================== RESEND VERIFICATION =====================
  app.post('/api/v1/auth/resend-verification', { preHandler: [forgotPasswordRateLimit] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, tenantSlug } = z.object({ email: z.string().email(), tenantSlug: z.string() }).parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const user = await db('users').where({ email, tenant_id: tenant.id }).first();
    if (!user || user.email_verified) {
      return sendSuccess(reply, { message: 'If an account exists, a verification email has been sent.' });
    }

    const verificationToken = generateVerificationToken();
    await db('users').where({ id: user.id }).update({ email_verification_token: verificationToken });

    try {
      const verifyUrl = `${env.APP_URL}/verify-email?token=${verificationToken}`;
      await sendEmail({
        to: user.email,
        subject: 'Verify your email — Vision Healthcare',
        html: `<p>Please verify your email by clicking: <a href="${verifyUrl}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
      });
    } catch {
      // Best-effort
    }

    return sendSuccess(reply, { message: 'If an account exists, a verification email has been sent.' });
  });

  // ===================== 2FA SETUP =====================
  app.post('/api/v1/auth/mfa/setup', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = getCtx(request);

    const { secret, otpauthUrl } = generateSecret();
    const qrCode = await generateQrCode(otpauthUrl);

    await db('users').where({ id: userId }).update({ mfa_secret: secret });

    return sendSuccess(reply, { secret, qrCode, otpauthUrl });
  });

  // ===================== 2FA ENABLE =====================
  app.post('/api/v1/auth/mfa/enable', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(request.body);
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId }).first();
    if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not set up');

    const valid = verifyToken(code, user.mfa_secret);
    if (!valid) throw new UnauthorizedError('Invalid code. Please try again.');

    await db('users').where({ id: userId }).update({ mfa_enabled: true });

    const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

    await logAudit({ tenantId, userId, action: 'user.mfa_enabled' });

    return sendSuccess(reply, { message: 'Two-factor authentication enabled.', recoveryCodes });
  });

  // ===================== 2FA DISABLE =====================
  app.post('/api/v1/auth/mfa/disable', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(app, r, rep)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(request.body);
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId }).first();
    if (!user || !user.mfa_enabled) throw new UnauthorizedError('MFA is not enabled');

    const valid = verifyToken(code, user.mfa_secret!);
    if (!valid) throw new UnauthorizedError('Invalid code.');

    await db('users').where({ id: userId }).update({ mfa_enabled: false, mfa_secret: null });

    await logAudit({ tenantId, userId, action: 'user.mfa_disabled' });

    return sendSuccess(reply, { message: 'Two-factor authentication disabled.' });
  });

  // ===================== SEND OTP =====================
  app.post('/api/v1/auth/otp/send', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identifier, tenantSlug } = z.object({ identifier: z.string(), tenantSlug: z.string() }).parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const sent = await createAndSendOtp(tenant.id, identifier, 'verify_phone');
    if (!sent) throw new UnauthorizedError('Failed to send OTP');

    return sendSuccess(reply, { message: 'OTP sent successfully.' });
  });

  // ===================== VERIFY OTP =====================
  app.post('/api/v1/auth/otp/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identifier, code, purpose } = z.object({
      identifier: z.string(), code: z.string(), purpose: z.string().optional(),
    }).parse(request.body);

    const valid = await verifyOtp(identifier, code, purpose || 'verify_phone');
    if (!valid) {
      await incrementOtpAttempt(identifier, code, purpose || 'verify_phone');
      throw new UnauthorizedError('Invalid or expired OTP code.');
    }

    return sendSuccess(reply, { message: 'OTP verified successfully.' });
  });
}
