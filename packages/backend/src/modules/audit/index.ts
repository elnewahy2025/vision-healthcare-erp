import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import type { AuditLogRow } from "../types.js";
import { authenticate } from '../auth-guard.js';
import { authorize, hasPermission, type Principal } from '../../services/authorization.js';

/**
 * Scope resolution for audit module.
 * Audit logs have branch_id column (from migration 033).
 */
function resolveAuditScope(principal: Principal): { denied: boolean; branchIds?: string[] } {
  if (hasPermission(principal, 'audit.view', 'system') || hasPermission(principal, 'audit.view', 'tenant')) {
    return { denied: false };
  }
  if (hasPermission(principal, 'audit.view', 'branch') || hasPermission(principal, 'audit.view', 'branches')) {
    return { denied: false, branchIds: principal.branches };
  }
  return { denied: true };
}

export async function registerAuditModule(app: FastifyInstance) {
  app.get('/api/v1/audit-logs', { preHandler: [authenticate, authorize('audit.view')] }, async (request, reply) => {
    const { tenantId, principal } = getCtx(request);
    const scope = resolveAuditScope(principal);

    const query = z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(20),
      action: z.string().optional(),
      entityType: z.string().optional(),
      userId: z.string().uuid().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).parse(request.query);

    const qb = db('audit_logs').where({ tenant_id: tenantId });

    if (scope.denied) {
      qb.where(db.raw('false'));
    } else if (scope.branchIds !== undefined && scope.branchIds.length > 0) {
      qb.whereIn('branch_id', scope.branchIds);
    } else if (scope.branchIds !== undefined && scope.branchIds.length === 0) {
      qb.where(db.raw('false'));
    }

    if (query.action) qb.andWhere('action', 'like', `${query.action}%`);
    if (query.entityType) qb.andWhere({ entity_type: query.entityType });
    if (query.userId) qb.andWhere({ user_id: query.userId });
    if (query.from) qb.andWhere('created_at', '>=', new Date(query.from));
    if (query.to) qb.andWhere('created_at', '<=', new Date(query.to));

    const total = await qb.clone().count('id as count').first();
    const logs = await qb.orderBy('created_at', 'desc').limit(query.limit).offset((query.page - 1) * query.limit);

    return sendPaginated(reply, logs, Number((total as Record<string, unknown>)?.count || 0), query.page, query.limit);
  });

  app.get('/api/v1/audit-logs/:id', { preHandler: [authenticate, authorize('audit.view')] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const log = await db('audit_logs').where({ id, tenant_id: tenantId }).first();
    if (!log) return reply.code(404).send({ error: 'Not found' });
    return sendSuccess(reply, log);
  });

  app.get('/api/v1/audit-logs/actions/types', { preHandler: [authenticate, authorize('audit.view')] }, async (request, reply) => {
    const { tenantId } = getCtx(request);
    const actions = await db('audit_logs').where({ tenant_id: tenantId }).distinct('action').orderBy('action');
    return sendSuccess(reply, actions.map((a: AuditLogRow) => a.action));
  });

  app.get('/api/v1/audit/logs/export', { preHandler: [authenticate, authorize('audit.export')] }, async (request, reply) => {
    const { tenantId, principal } = getCtx(request);
    const scope = resolveAuditScope(principal);

    const query = z.object({ format: z.enum(['csv', 'json']).optional().default('json'), action: z.string().optional(), entityType: z.string().optional(), fromDate: z.string().optional(), toDate: z.string().optional() }).parse(request.query);

    let dbQuery = db('audit_logs').where({ tenant_id: tenantId });

    if (scope.denied) {
      dbQuery = dbQuery.where(db.raw('false'));
    } else if (scope.branchIds !== undefined && scope.branchIds.length > 0) {
      dbQuery = dbQuery.whereIn('branch_id', scope.branchIds);
    } else if (scope.branchIds !== undefined && scope.branchIds.length === 0) {
      dbQuery = dbQuery.where(db.raw('false'));
    }

    if (query.action) dbQuery = dbQuery.andWhere({ action: query.action });
    if (query.entityType) dbQuery = dbQuery.andWhere({ entity_type: query.entityType });
    if (query.fromDate) dbQuery = dbQuery.andWhere('created_at', '>=', query.fromDate);
    if (query.toDate) dbQuery = dbQuery.andWhere('created_at', '<=', query.toDate + 'T23:59:59');

    const logs = await dbQuery.orderBy('created_at', 'desc').limit(10000);

    if (query.format === 'csv') {
      const headers = ['id', 'action', 'entity_type', 'entity_id', 'user_id', 'ip_address', 'created_at'];
      const csv = [headers.join(','), ...logs.map((l: Record<string, unknown>) => headers.map(h => String(l[h] || '').replace(/,/g, ';')).join(','))].join('\n');
      return reply.type('text/csv').header('Content-Disposition', 'attachment; filename=audit-logs.csv').send(csv);
    }

    return sendSuccess(reply, logs);
  });
}
