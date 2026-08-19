import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';
import { authorize, hasPermission, type Principal } from '../../services/authorization.js';
import type { CrmCampaignRow, PaginationQuery } from "../types.js";

function resolveCrmScope(principal: Principal): { denied: boolean } {
  if (hasPermission(principal, 'crm.view', 'system') || hasPermission(principal, 'crm.view', 'tenant')) return { denied: false };
  if (hasPermission(principal, 'crm.view', 'branch') || hasPermission(principal, 'crm.view', 'branches')) return { denied: false };
  return { denied: true };
}

export async function registerCrmModule(app: FastifyInstance) {
  app.get('/api/v1/crm/campaigns', { preHandler: [authenticate, authorize('crm.view')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { principal } = getCtx(request);
    const scope = resolveCrmScope(principal);
    const { status } = request.query as PaginationQuery & { status?: string };
    let q = db('crm_campaigns').where('crm_campaigns.tenant_id', tenantId).whereNull('crm_campaigns.deleted_at');
    if (scope.denied) q = q.where(db.raw('false'));
    if (status) q = q.andWhere('crm_campaigns.status', status);
    const rows = await q.orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, rows.map((c: Record<string, unknown>) => ({ id: c.id, name: c.name, type: c.type, status: c.status, description: c.description, startDate: c.start_date, endDate: c.end_date, budget: Number(c.budget), targetCount: c.target_count, reachedCount: c.reached_count, conversionCount: c.conversion_count })));
  });

  app.post('/api/v1/crm/campaigns', { preHandler: [authenticate, authorize('crm.create')] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as Record<string, unknown>;
    const [camp] = await db('crm_campaigns').insert({ tenant_id: tenantId, name: body.name, type: body.type || 'email', description: body.description, start_date: body.startDate, end_date: body.endDate, budget: body.budget || 0, target_count: body.targetCount || 0, created_by: ctx.userId }).returning('*');
    return sendSuccess(reply, { id: camp.id, name: camp.name }, 'Campaign created', 201);
  });
}
