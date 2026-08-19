import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';
import { authorize, hasPermission, type Principal } from '../../services/authorization.js';
import { logAudit } from '../../services/audit.js';

/**
 * Scope resolution for queue module.
 * Queue entries are branch-scoped.
 */
function resolveQueueScope(principal: Principal, requestedBranchId?: string): { branchFilter: string | null } {
  if (hasPermission(principal, 'queue.view', 'system') || hasPermission(principal, 'queue.view', 'tenant')) {
    return { branchFilter: requestedBranchId || null };
  }
  if (hasPermission(principal, 'queue.view', 'branch') || hasPermission(principal, 'queue.view', 'branches')) {
    // Restrict to user's assigned branches
    if (requestedBranchId && principal.branches.includes(requestedBranchId)) {
      return { branchFilter: requestedBranchId };
    }
    // If no specific branch requested, show all user's branches
    return { branchFilter: principal.branches[0] || null };
  }
  return { branchFilter: null };
}

export async function registerQueueModule(app: FastifyInstance) {
  app.get('/api/v1/queue', { preHandler: [authenticate, authorize('queue.view')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { principal } = getCtx(request);
    const { branchId, serviceType, status } = request.query as { branchId?: string; serviceType?: string; status?: string };
    const scope = resolveQueueScope(principal, branchId);

    let q = db('queue_entries').where('queue_entries.tenant_id', tenantId);

    if (scope.branchFilter) {
      q = q.andWhere('queue_entries.branch_id', scope.branchFilter);
    }

    if (serviceType) q = q.andWhere('queue_entries.service_type', serviceType);
    if (status) q = q.andWhere('queue_entries.status', status);
    else q = q.whereNotIn('queue_entries.status', ['completed', 'no_show']);

    const entries = await q.join('patients', 'queue_entries.patient_id', 'patients.id')
      .select('queue_entries.*', 'patients.first_name as p_first', 'patients.last_name as p_last', 'patients.medical_record_number')
      .orderBy('position', 'asc');

    await logAudit({ tenantId, userId: principal.userId, action: 'queue.listed', entityType: 'queue_entries' });

    return sendSuccess(reply, entries.map(mapEntry));
  });

  app.post('/api/v1/queue', { preHandler: [authenticate, authorize('queue.create')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as Record<string, unknown>;
    const branchId = body.branchId || ctx.branchId || null;
    const maxPos = await db('queue_entries').where({ tenant_id: tenantId, branch_id: branchId, status: 'waiting' }).max('position as m').first();
    const qNum = "Q-" + String(Date.now()).slice(-6);
    const [entry] = await db('queue_entries').insert({
      tenant_id: tenantId, branch_id: branchId, patient_id: body.patientId,
      appointment_id: body.appointmentId || null, doctor_id: body.doctorId || null,
      service_type: body.serviceType || 'consultation', queue_number: qNum,
      priority: body.priority || 0, position: (maxPos?.m || 0) + 1, status: 'waiting',
    }).returning('*');

    await logAudit({ tenantId, userId: ctx.userId, action: 'queue.entry_added', entityType: 'queue_entry', entityId: entry.id, metadata: { queueNumber: qNum }, ipAddress: request.ip, userAgent: request.headers['user-agent'] as string });

    return sendSuccess(reply, mapEntry(entry), 'Added to queue', 201);
  });

  app.put('/api/v1/queue/:id/call', { preHandler: [authenticate, authorize('queue.edit')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    await db('queue_entries').where({ id, tenant_id: tenantId }).update({ status: 'called', called_at: new Date() });

    await logAudit({ tenantId, userId: ctx.userId, action: 'queue.patient_called', entityType: 'queue_entry', entityId: id, ipAddress: request.ip, userAgent: request.headers['user-agent'] as string });

    return sendSuccess(reply, null, 'Patient called');
  });

  app.put('/api/v1/queue/:id/status', { preHandler: [authenticate, authorize('queue.edit')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = getTenantId(request);
    const { status } = request.body as Record<string, unknown>;
    const update: Record<string, unknown> = { status };
    if (status === 'in_progress') update.started_at = new Date();
    if (status === 'completed') update.completed_at = new Date();
    await db('queue_entries').where({ id, tenant_id: tenantId }).update(update);
    return sendSuccess(reply, null, 'Queue updated');
  });
}

function mapEntry(e: Record<string, unknown>) {
  return {
    id: e.id, queueNumber: e.queue_number, patientId: e.patient_id,
    patientName: e.p_first + ' ' + e.p_last, patientMrn: e.medical_record_number,
    serviceType: e.service_type, doctorId: e.doctor_id, branchId: e.branch_id,
    status: e.status, priority: e.priority, position: e.position,
    calledAt: e.called_at, startedAt: e.started_at, completedAt: e.completed_at,
    createdAt: e.created_at,
  };
}
