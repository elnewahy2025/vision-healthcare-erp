import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '@healthcare/shared/errors';

/**
 * Creates a preHandler that checks the authenticated user has ALL required permissions.
 * Usage: { preHandler: [authenticate, requirePermission('users.create', 'users.delete')] }
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const req = request as FastifyRequest & {
      ctx?: { permissions: string[]; roles: string[] };
    };
    const { permissions = [], roles = [] } = req.ctx || {};

    // super_admin bypasses all permission checks
    if (roles.includes('super_admin')) return;

    const hasAll = requiredPermissions.every((p) => permissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenError(
        `Missing permissions: ${requiredPermissions.filter((p) => !permissions.includes(p)).join(', ')}`,
      );
    }
  };
}
