import { getCtx, getTenantId } from "../../utils/route-helper.js";
import { loginRateLimit, registerRateLimit, forgotPasswordRateLimit, refreshRateLimit } from '../../utils/rate-limiter.js';
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { loginSchema } from '../../utils/validation.js';
import { UnauthorizedError, ConflictError } from '@healthcare/shared/errors';
import type { User, Role } from '@healthcare/shared/types';
import { generateSecret, verifyToken, generateQrCode } from '../../services/totp.js';
import { createAndSendOtp, verifyOtp, incrementOtpAttempt } from '../../services/otp.js';
import { sendNotification } from '../../services/notification.js';
import { logAudit } from '../../services/audit.js';
import { generateTokenPair, rotateRefreshToken, revokeRefreshToken } from '../../services/refresh-token.js';
import { getEnv } from '@healthcare/shared/config';

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,30}$/;

export async function registerAuthModule(app: FastifyInstance) {

  // ===================== REGISTER TENANT =====================
  app.post('/api/v1/tenants', { preHandler: [registerRateLimit] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(2).max(200),
      slug: z.string().regex(TENANT_SLUG_REGEX, '3-30 chars, lowercase, hyphens only'),
      locale: z.enum(['ar', 'en']).default('en'),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(8),
      adminName: z.string().min(2),
    });

    const body = schema.parse(request.body);

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

      const passwordHash = await bcrypt.hash(body.adminPassword, 12);

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
        locale: body.locale, status: 'active', mfa_enabled: false,
        password_changed_at: new Date(),
      }).returning('*');

      return { tenant, user, adminRole };
    });

    return sendSuccess(reply, {
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      message: 'Organization created successfully.',
    }, 'Organization created', 201);
  });

  // ===================== LOGIN =====================
  app.post('/api/v1/auth/login', { preHandler: [loginRateLimit] }, async (request, reply) => {
    const { email, password, tenantSlug } = loginSchema.parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization code');

    const user = await db('users').where({ email, tenant_id: tenant.id }).first();
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw new UnauthorizedError('Invalid email or password');

    if (user.status !== 'active') throw new UnauthorizedError('Account is not active');

    // Check if MFA is enabled — return partial tokens for MFA step
    if (user.mfa_enabled) {
      const partialToken = (app.jwt.sign as any)({ tenantId: tenant.id, userId: user.id, roles: [], permissions: [], locale: user.locale || 'en', mfaPending: true }, { expiresIn: '5m' });
      return sendSuccess(reply, { mfaRequired: true, partialToken, userId: user.id });
    }

    const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    const roles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;

    const token = app.jwt.sign({
      tenantId: tenant.id, userId: user.id,
      roles, permissions, locale: user.locale || 'en',
    }, { expiresIn: '1h' });

    const { refreshToken } = await generateTokenPair(
      user.id, tenant.id,
      (request as unknown as { ip?: string }).ip,
      (request as unknown as { headers?: Record<string, string> }).headers?.['user-agent'],
    );

    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });

    await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.login', ipAddress: request.ip, userAgent: request.headers['user-agent'] });

    return sendSuccess(reply, {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        roles, permissions, locale: user.locale, status: user.status, mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at, createdAt: user.created_at },
      tokens: { accessToken: token, refreshToken, expiresIn: 3600 },
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, locale: tenant.locale,
        direction: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).direction || 'ltr' : 'ltr',
        settings: {
          dateFormat: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).dateFormat : 'MM/DD/YYYY',
          currency: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).currency : 'SAR',
          timezone: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).timezone : 'Asia/Riyadh',
          theme: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).theme : {},
        },
      } : null,
    });
  });

  // ===================== VERIFY MFA TOKEN =====================
  app.post('/api/v1/auth/mfa/verify', async (request, reply) => {
    const schema = z.object({ partialToken: z.string(), code: z.string().length(6) });
    const { partialToken, code } = schema.parse(request.body);

    let decoded: { userId?: string; tenantId?: string; mfaPending?: boolean; [key: string]: unknown };
    try { decoded = app.jwt.verify(partialToken); } catch { throw new UnauthorizedError('Invalid or expired token'); }
    if (!decoded.mfaPending) throw new UnauthorizedError('Invalid token type');

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not configured');

    const valid = verifyToken(code, user.mfa_secret);
    if (!valid) throw new UnauthorizedError('Invalid MFA code');

    const tenant = await db('tenants').where({ id: decoded.tenantId }).first();
    const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    const roles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;

    const token = app.jwt.sign({
      tenantId: tenant.id, userId: user.id, roles, permissions, locale: user.locale || 'en',
    }, { expiresIn: '1h' });

    const { refreshToken } = await generateTokenPair(
      user.id, tenant.id,
      (request as unknown as { ip?: string }).ip,
      (request as unknown as { headers?: Record<string, string> }).headers?.['user-agent'],
    );

    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });
    await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.login.mfa', ipAddress: request.ip });

    return sendSuccess(reply, {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        roles, permissions, locale: user.locale, status: user.status, mfaEnabled: true,
        lastLoginAt: user.last_login_at, createdAt: user.created_at },
      tokens: { accessToken: token, refreshToken, expiresIn: 3600 },
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, locale: tenant.locale,
        direction: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).direction || 'ltr' : 'ltr',
        settings: { dateFormat: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).dateFormat : 'MM/DD/YYYY',
          currency: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).currency : 'SAR',
          timezone: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).timezone : 'Asia/Riyadh',
          theme: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).theme : {},
        },
      } : null,
    });
  });

  // ===================== REFRESH TOKEN =====================
  app.post('/api/v1/auth/refresh', { preHandler: [refreshRateLimit] }, async (request, reply) => {
    const body = request.body as Record<string, unknown> | undefined;
    const refreshToken = body?.refreshToken as string | undefined;
    if (!refreshToken) throw new UnauthorizedError('Refresh token required');

    const result = await rotateRefreshToken(
      refreshToken,
      (request as unknown as { ip?: string }).ip,
      (request as unknown as { headers?: Record<string, string> }).headers?.['user-agent'],
    );

    if (!result) throw new UnauthorizedError('Invalid or expired refresh token');

    const tokenPayload = await db.raw(
      `SELECT u.id as user_id, u.tenant_id, u.permissions, u.roles, u.locale, u.status
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = ?`,
      [crypto.createHash('sha256').update(result.refreshToken).digest('hex')],
    );

    if (!tokenPayload?.rows?.[0]) throw new UnauthorizedError('User not found');
    const row = tokenPayload.rows[0];
    if (row.status !== 'active') throw new UnauthorizedError('Account not active');

    const permissions = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
    const roles = typeof row.roles === 'string' ? JSON.parse(row.roles) : row.roles;

    const token = app.jwt.sign({
      tenantId: row.tenant_id, userId: row.user_id,
      roles, permissions, locale: row.locale || 'en',
    }, { expiresIn: '1h' });

    await logAudit({ tenantId: row.tenant_id, userId: row.user_id, action: 'user.token_refresh' });

    return sendSuccess(reply, { accessToken: token, refreshToken: result.refreshToken, expiresIn: 3600 });
  });


  // ===================== LOGOUT =====================
  app.post('/api/v1/auth/logout', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { userId, tenantId } = getCtx(request);
    const body = request.body as Record<string, unknown> | undefined;
    const refreshToken = body?.refreshToken as string | undefined;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    await logAudit({ tenantId, userId, action: 'user.logout' });

    return sendSuccess(reply, { message: 'Logged out successfully.' });
  });

  // ===================== CURRENT USER =====================
  app.get('/api/v1/auth/me', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { userId, tenantId } = getCtx(request);
    const user = await db('users').where({ id: userId }).first();
    const tenant = await db('tenants').where({ id: tenantId }).first();
    if (!user) throw new UnauthorizedError('User not found');
    const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
    const roles = typeof user.roles === 'string' ? JSON.parse(user.roles) : user.roles;
    return sendSuccess(reply, {
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
        roles, permissions, locale: user.locale, status: user.status, mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at, passwordChangedAt: user.password_changed_at, createdAt: user.created_at },
      tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, locale: tenant.locale,
        direction: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).direction || 'ltr' : 'ltr',
        settings: { dateFormat: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).dateFormat : 'MM/DD/YYYY',
          currency: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).currency : 'SAR',
          timezone: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).timezone : 'Asia/Riyadh',
          theme: tenant.settings && typeof tenant.settings === 'object' ? (tenant.settings as any).theme : {},
        },
      } : null,
    });
  });

  // ===================== FORGOT PASSWORD =====================
  app.post('/api/v1/auth/forgot-password', { preHandler: [forgotPasswordRateLimit] }, async (request, reply) => {
    const { email, tenantSlug } = z.object({ email: z.string().email(), tenantSlug: z.string() }).parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) return sendSuccess(reply, { message: 'If the email is registered, you will receive a reset link.' });

    const user = await db('users').where({ email, tenant_id: tenant.id }).first();

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db('password_resets').insert({ tenant_id: tenant.id, user_id: user.id, token, type: 'password_reset', expires_at: expiresAt });

      const resetLink = `${getEnv().APP_URL}/reset-password?token=${token}`;

      await sendNotification({ tenantId: tenant.id, userId: user.id, channel: 'email', recipient: email,
        templateKey: 'password.reset', variables: { resetLink }, locale: user.locale });

      await logAudit({ tenantId: tenant.id, userId: user.id, action: 'user.forgot_password' });
    }

    return sendSuccess(reply, { message: 'If the email is registered, you will receive a reset link.' });
  });

  // ===================== RESET PASSWORD =====================
  app.post('/api/v1/auth/reset-password', async (request, reply) => {
    const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(request.body);

    const reset = await db('password_resets').where({ token, type: 'password_reset', used_at: null }).first();
    if (!reset || new Date(reset.expires_at) < new Date()) throw new UnauthorizedError('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(password, 12);

    await db.transaction(async (trx) => {
      await trx('users').where({ id: reset.user_id }).update({ password_hash: passwordHash, password_changed_at: new Date() });
      await trx('password_resets').where({ id: reset.id }).update({ used_at: new Date() });
    });

    await logAudit({ tenantId: reset.tenant_id, userId: reset.user_id, action: 'user.reset_password' });

    return sendSuccess(reply, { message: 'Password reset successfully. You can now log in.' });
  });

  // ===================== CHANGE PASSWORD =====================
  app.post('/api/v1/auth/change-password', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { currentPassword, newPassword } = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }).parse(request.body);
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId }).first();
    if (!user) throw new UnauthorizedError('User not found');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db('users').where({ id: userId }).update({ password_hash: passwordHash, password_changed_at: new Date() });

    await logAudit({ tenantId, userId, action: 'user.change_password' });

    return sendSuccess(reply, { message: 'Password changed successfully.' });
  });

  // ===================== 2FA SETUP (Generate Secret + QR) =====================
  app.post('/api/v1/auth/mfa/setup', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { userId } = getCtx(request);

    const { secret, otpauthUrl } = generateSecret();
    const qrCode = await generateQrCode(otpauthUrl);

    // Store secret temporarily (not enabled yet)
    await db('users').where({ id: userId }).update({ mfa_secret: secret });

    return sendSuccess(reply, { secret, qrCode, otpauthUrl });
  });

  // ===================== 2FA ENABLE (Confirm code to activate) =====================
  app.post('/api/v1/auth/mfa/enable', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { code } = z.object({ code: z.string().length(6) }).parse(request.body);
    const { userId, tenantId } = getCtx(request);

    const user = await db('users').where({ id: userId }).first();
    if (!user || !user.mfa_secret) throw new UnauthorizedError('MFA not set up');

    const valid = verifyToken(code, user.mfa_secret);
    if (!valid) throw new UnauthorizedError('Invalid code. Please try again.');

    await db('users').where({ id: userId }).update({ mfa_enabled: true });

    // Generate recovery codes (8 random codes)
    const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));

    await logAudit({ tenantId, userId, action: 'user.mfa_enabled' });

    return sendSuccess(reply, { message: 'Two-factor authentication enabled.', recoveryCodes });
  });

  // ===================== 2FA DISABLE =====================
  app.post('/api/v1/auth/mfa/disable', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
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
  app.post('/api/v1/auth/otp/send', async (request, reply) => {
    const { identifier, tenantSlug } = z.object({ identifier: z.string(), tenantSlug: z.string() }).parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization');

    const sent = await createAndSendOtp(tenant.id, identifier, 'verify_phone');
    if (!sent) throw new UnauthorizedError('Failed to send OTP');

    return sendSuccess(reply, { message: 'OTP sent successfully.' });
  });

  // ===================== VERIFY OTP =====================
  app.post('/api/v1/auth/otp/verify', async (request, reply) => {
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
