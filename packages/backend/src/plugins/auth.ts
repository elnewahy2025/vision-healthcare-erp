import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { getEnv } from '@healthcare/shared/config';
import { UnauthorizedError, ForbiddenError } from '@healthcare/shared/errors';
import { db } from '../core/database.js';

const env = getEnv();

export async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: '15m' },
  });

  app.decorate('authenticate', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const req = request as any;
    const { tenantId, userId, roles, permissions, locale, branchId } = request.user as any;
    req.tenantId = tenantId;
    req.ctx = {
      tenantId,
      userId,
      roles: roles || [],
      permissions: permissions || [],
      locale: locale || 'en',
      branchId,
      requestId: request.id,
    };
  });

  app.decorate(
    'authorize',
    (...requiredPermissions: string[]) =>
      async function (request: FastifyRequest) {
        const req = request as any;
        const { permissions, roles } = req.ctx;
        if (roles.includes('super_admin')) return;
        const hasAll = requiredPermissions.every((p) => permissions.includes(p));
        if (!hasAll) {
          throw new ForbiddenError('Insufficient permissions');
        }
      },
  );

  app.addHook('onRequest', async (request: FastifyRequest) => {
    const tenantSlug = request.headers['x-tenant-slug'] as string;
    if (!tenantSlug && request.url !== '/health' && !request.url.startsWith('/api/v1/tenants')) {
      return;
    }
    if (tenantSlug) {
      const tenant = await db('tenants').where({ slug: tenantSlug }).first();
      if (tenant) {
        (request as any).tenantId = tenant.id;
      }
    }
  });
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      tenantId: string;
      userId: string;
      roles: string[];
      permissions: string[];
      locale: 'ar' | 'en';
      branchId?: string;
      mfaPending?: boolean;
    };
    user: {
      tenantId: string;
      userId: string;
      roles: string[];
      permissions: string[];
      locale: 'ar' | 'en';
      branchId?: string;
      mfaPending?: boolean;
    };
  }
}
