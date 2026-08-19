import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { PatientNotFoundError } from '@healthcare/shared/errors';
import { authenticate } from '../auth-guard.js';
import { authorize, hasPermission, assignedPatientIds, type Principal } from '../../services/authorization.js';
import { logAudit } from '../../services/audit.js';

/**
 * Scope resolution for radiology module.
 */
async function resolveRadiologyListScope(principal: Principal): Promise<{
  branchIds?: string[];
  patientIds?: string[];
}> {
  if (hasPermission(principal, 'radiology.view', 'system') || hasPermission(principal, 'radiology.view', 'tenant')) {
    return {};
  }
  if (hasPermission(principal, 'radiology.view', 'branch') || hasPermission(principal, 'radiology.view', 'branches')) {
    return { branchIds: principal.branches };
  }
  if (hasPermission(principal, 'radiology.view', 'department') || hasPermission(principal, 'radiology.view', 'assigned_patients')) {
    return { patientIds: await assignedPatientIds(principal) };
  }
  return { patientIds: [] };
}

export async function registerRadiologyModule(app: FastifyInstance) {
  app.get('/api/v1/radiology/orders', { preHandler: [authenticate, authorize('radiology.view')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { principal } = getCtx(request);
    const { status, patientId } = request.query as { patientId?: string; status?: string };
    const scope = await resolveRadiologyListScope(principal);

    let q = db('radiology_orders')
      .where('radiology_orders.tenant_id', tenantId)
      .whereNull('radiology_orders.deleted_at');

    if (scope.branchIds !== undefined) {
      if (scope.branchIds.length === 0) {
        q = q.where(db.raw('false'));
      } else {
        q = q.whereIn('radiology_orders.patient_id', function () {
          this.select('id').from('patients').whereIn('branch_id', scope.branchIds!);
        });
      }
    }
    if (scope.patientIds !== undefined) {
      if (scope.patientIds.length === 0) {
        q = q.where(db.raw('false'));
      } else {
        q = q.whereIn('radiology_orders.patient_id', scope.patientIds);
      }
    }

    if (status) q = q.andWhere('radiology_orders.status', status);
    if (patientId) q = q.andWhere('radiology_orders.patient_id', patientId);

    const orders = await q.join('patients', 'radiology_orders.patient_id', 'patients.id')
      .select('radiology_orders.*', 'patients.first_name as p_first', 'patients.last_name as p_last', 'patients.medical_record_number')
      .orderBy('created_at', 'desc').limit(50);

    await logAudit({ tenantId, userId: principal.userId, action: 'radiology.orders_listed', entityType: 'radiology_orders' });
    return sendSuccess(reply, orders.map(mapOrder));
  });

  app.post('/api/v1/radiology/orders', { preHandler: [authenticate, authorize('radiology.create')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as Record<string, unknown>;
    const patient = await db('patients').where({ id: body.patientId, tenant_id: tenantId }).first();
    if (!patient) throw new PatientNotFoundError(String(body.patientId));
    const orderNum = "RAD-" + Date.now().toString(36).toUpperCase();
    const [order] = await db('radiology_orders').insert({
      tenant_id: tenantId, patient_id: body.patientId, doctor_id: ctx.userId,
      appointment_id: body.appointmentId || null, order_number: orderNum,
      study_type: body.studyType, body_part: body.bodyPart, priority: body.priority || 'routine',
      order_date: new Date().toISOString().split('T')[0], clinical_indication: body.clinicalIndication,
      created_by: ctx.userId,
    }).returning('*');

    await logAudit({ tenantId, userId: ctx.userId, action: 'radiology.order_created', entityType: 'radiology_order', entityId: order.id, metadata: { orderNumber: orderNum, studyType: body.studyType }, ipAddress: request.ip, userAgent: request.headers['user-agent'] as string });

    return sendSuccess(reply, { id: order.id, orderNumber: order.order_number }, 'Radiology order created', 201);
  });

  app.put('/api/v1/radiology/orders/:id', { preHandler: [authenticate, authorize('radiology.edit')] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const update: Record<string, unknown> = { updated_at: new Date() };
    if (body.status) update.status = body.status;
    if (body.findings) update.findings = body.findings;
    if (body.impression) update.impression = body.impression;
    if (body.report) update.report = body.report;
    if (body.radiologistId) update.radiologist_id = body.radiologistId;
    if (body.scheduledDate) update.scheduled_date = body.scheduledDate;
    if (body.status === 'in_progress') update.started_at = new Date();
    if (body.status === 'completed') update.completed_at = new Date();
    await db('radiology_orders').where({ id, tenant_id: tenantId }).update(update);

    await logAudit({ tenantId, userId: ctx.userId, action: 'radiology.order_updated', entityType: 'radiology_order', entityId: id, metadata: { updatedFields: Object.keys(update).filter(k => k !== 'updated_at') }, ipAddress: request.ip, userAgent: request.headers['user-agent'] as string });

    return sendSuccess(reply, null, 'Order updated');
  });
}

function mapOrder(o: Record<string, unknown>) {
  return {
    id: o.id, orderNumber: o.order_number, patientId: o.patient_id,
    patientName: `${o.p_first || ''} ${o.p_last || ''}`.trim(), patientMrn: o.medical_record_number,
    studyType: o.study_type, bodyPart: o.body_part, status: o.status,
    priority: o.priority, orderDate: o.order_date, scheduledDate: o.scheduled_date,
    clinicalIndication: o.clinical_indication, findings: o.findings,
    impression: o.impression, report: o.report, dicomLink: o.dicom_link,
    createdAt: o.created_at,
  };
}
