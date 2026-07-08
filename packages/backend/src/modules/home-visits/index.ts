import type { FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';

export async function registerHomeVisitsModule(app: FastifyInstance) {
  app.get('/api/v1/home-visits', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { status, assignedTo } = request.query as any;
    let q = db('home_visits').where('home_visits.tenant_id', tenantId).whereNull('home_visits.deleted_at');
    if (status) q = q.andWhere('home_visits.status', status);
    if (assignedTo) q = q.andWhere('home_visits.assigned_to', assignedTo);
    const visits = await q.join('patients', 'home_visits.patient_id', 'patients.id')
      .join('users', 'home_visits.assigned_to', 'users.id')
      .select('home_visits.*', 'patients.first_name as p_first', 'patients.last_name as p_last', 'users.first_name as n_first', 'users.last_name as n_last')
      .orderBy('scheduled_date', 'asc').limit(50);
    return sendSuccess(reply, visits.map((v: any) => ({
      id: v.id, visitNumber: v.visit_number, patientId: v.patient_id,
      patientName: v.p_first + ' ' + v.p_last, status: v.status,
      visitType: v.visit_type, scheduledDate: v.scheduled_date, scheduledTime: v.scheduled_time,
      address: v.address, notes: v.notes, clinicalNotes: v.clinical_notes,
      assignedTo: v.assigned_to, assignedToName: v.n_first + ' ' + v.n_last,
      startedAt: v.started_at, completedAt: v.completed_at, createdAt: v.created_at,
    })));
  });

  app.post('/api/v1/home-visits', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as any;
    const visitNum = "HV-" + Date.now().toString(36).toUpperCase();
    const [visit] = await db('home_visits').insert({
      tenant_id: tenantId, patient_id: body.patientId, assigned_to: body.assignedTo,
      created_by: ctx.userId, visit_number: visitNum, visit_type: body.visitType || 'checkup',
      scheduled_date: body.scheduledDate, scheduled_time: body.scheduledTime || null,
      address: body.address, notes: body.notes || null,
    }).returning('*');
    return sendSuccess(reply, { id: visit.id, visitNumber: visit.visit_number }, 'Home visit scheduled', 201);
  });

  app.put('/api/v1/home-visits/:id', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any; const body = request.body as any;
    const update: any = { updated_at: new Date() };
    if (body.status) update.status = body.status;
    if (body.clinicalNotes) update.clinical_notes = body.clinicalNotes;
    if (body.status === 'in_progress') update.started_at = new Date();
    if (body.status === 'completed') update.completed_at = new Date();
    await db('home_visits').where({ id }).update(update);
    return sendSuccess(reply, null, 'Visit updated');
  });
}
