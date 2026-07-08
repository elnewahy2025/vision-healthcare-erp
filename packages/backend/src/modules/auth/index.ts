import { getCtx, getTenantId } from "../../utils/route-helper.js";
import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { loginSchema } from '../../utils/validation.js';
import { UnauthorizedError, ConflictError } from '@healthcare/shared/errors';
import type { User, Role } from '@healthcare/shared/types';

const TENANT_SLUG_REGEX = /^[a-z0-9-]{3,30}$/;

export async function registerAuthModule(app: FastifyInstance) {
  // Register tenant
  app.post('/api/v1/tenants', async (request, reply) => {
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
        name: body.name,
        slug: body.slug,
        locale: body.locale,
        settings: JSON.stringify({
          dateFormat: body.locale === 'ar' ? 'DD/MM/YYYY' : 'MM/DD/YYYY',
          currency: 'SAR',
          timezone: 'Asia/Riyadh',
          theme: {
            primaryColor: '#0ea5e9',
            brandName: body.name,
          },
          language: body.locale,
          direction: body.locale === 'ar' ? 'rtl' : 'ltr',
          features: {},
        }),
        status: 'active',
      }).returning('*');

      const passwordHash = await bcrypt.hash(body.adminPassword, 12);

      const [adminRole] = await trx('roles').insert({
        tenant_id: tenant.id,
        name: 'Super Admin',
        slug: 'super_admin',
        description: 'Full system access',
        permissions: JSON.stringify([
          'patient:read', 'patient:write', 'patient:delete',
          'appointment:read', 'appointment:write', 'appointment:delete',
          'emr:read', 'emr:write', 'emr:delete',
          'billing:read', 'billing:write', 'billing:delete',
          'admin:access', 'admin:users', 'admin:settings',
          'settings:read', 'settings:write',
        ]),
        is_system: true,
      }).returning('*');

      const [user] = await trx('users').insert({
        tenant_id: tenant.id,
        email: body.adminEmail,
        password_hash: passwordHash,
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
          'settings:read', 'settings:write',
        ]),
        locale: body.locale,
        status: 'active',
        mfa_enabled: false,
        password_changed_at: new Date(),
      }).returning('*');

      return { tenant, user, adminRole };
    });

    return sendSuccess(reply, {
      tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
      message: 'Organization created successfully. You can now log in.',
    }, 'Organization created', 201);
  });

  // Login
  app.post('/api/v1/auth/login', async (request, reply) => {
    const { email, password, tenantSlug } = loginSchema.parse(request.body);

    const tenant = await db('tenants').where({ slug: tenantSlug }).first();
    if (!tenant) throw new UnauthorizedError('Invalid organization code');

    const user = await db('users')
      .where({ email, tenant_id: tenant.id })
      .first();
    if (!user) throw new UnauthorizedError('Invalid email or password');

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) throw new UnauthorizedError('Invalid email or password');

    if (user.status !== 'active') throw new UnauthorizedError('Account is not active');

    const permissions = typeof user.permissions === 'string'
      ? JSON.parse(user.permissions) : user.permissions;

    const roles = typeof user.roles === 'string'
      ? JSON.parse(user.roles) : user.roles;

    const token = app.jwt.sign({
      tenantId: tenant.id,
      userId: user.id,
      roles,
      permissions,
      locale: user.locale,
      branchId: user.branch_id,
    });

    const refreshToken = app.jwt.sign(
      { tenantId: tenant.id, userId: user.id, type: 'refresh' } as any,
      { expiresIn: '7d' },
    );

    const settings = typeof tenant.settings === 'string'
      ? JSON.parse(tenant.settings) : tenant.settings;

    await db('users').where({ id: user.id }).update({
      last_login_at: new Date(),
    });

    return sendSuccess(reply, {
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        roles,
        permissions,
        locale: user.locale,
        status: user.status,
        mfaEnabled: user.mfa_enabled,
        branchId: user.branch_id,
        passwordChangedAt: user.password_changed_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      tokens: {
        accessToken: token,
        refreshToken,
        expiresIn: 900,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        locale: tenant.locale,
        direction: settings.direction || (tenant.locale === 'ar' ? 'rtl' : 'ltr'),
        settings: {
          dateFormat: settings.dateFormat,
          currency: settings.currency || 'SAR',
          timezone: settings.timezone,
          theme: settings.theme || { primaryColor: '#0ea5e9', brandName: tenant.name },
        },
      },
    });
  });

  // Refresh token
  app.post('/api/v1/auth/refresh', async (request, reply) => {
    const { refreshToken: token } = request.body as { refreshToken: string };
    try {
      const decoded = app.jwt.verify<{tenantId: string; userId: string; type?: string}>(token) as any;
      if (decoded.type !== 'refresh') throw new UnauthorizedError('Invalid refresh token');

      const user = await db('users').where({ id: decoded.userId }).first();
      if (!user || user.status !== 'active') throw new UnauthorizedError('User not found or inactive');

      const tenant = await db('tenants').where({ id: decoded.tenantId }).first();
      if (!tenant) throw new UnauthorizedError('Organization not found');

      const permissions = typeof user.permissions === 'string'
        ? JSON.parse(user.permissions) : user.permissions;
      const roles = typeof user.roles === 'string'
        ? JSON.parse(user.roles) : user.roles;

      const newToken = app.jwt.sign({
        tenantId: tenant.id,
        userId: user.id,
        roles,
        permissions,
        locale: user.locale,
      });

      return sendSuccess(reply, {
        accessToken: newToken,
        expiresIn: 900,
      });
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  });

  // Get current user profile
  app.get('/api/v1/auth/me', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const tenantId = getTenantId(request); const userId = getCtx(request).userId;
    const user = await db('users').where({ id: userId, tenant_id: tenantId }).first();
    if (!user) throw new UnauthorizedError('User not found');

    const tenant = await db('tenants').where({ id: tenantId }).first();
    const settings = typeof tenant?.settings === 'string'
      ? JSON.parse(tenant.settings) : (tenant?.settings || {});

    const permissions = typeof user.permissions === 'string'
      ? JSON.parse(user.permissions) : user.permissions;
    const roles = typeof user.roles === 'string'
      ? JSON.parse(user.roles) : user.roles;

    return sendSuccess(reply, {
      user: {
        id: user.id,
        tenantId: user.tenant_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        roles,
        permissions,
        locale: user.locale,
        status: user.status,
        mfaEnabled: user.mfa_enabled,
        branchId: user.branch_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        locale: tenant.locale,
        direction: settings.direction || 'ltr',
        settings: {
          dateFormat: settings.dateFormat,
          currency: settings.currency,
          timezone: settings.timezone,
          theme: settings.theme,
        },
      } : null,
    });
  });
}
