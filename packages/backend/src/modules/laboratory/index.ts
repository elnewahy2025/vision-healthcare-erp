import type { FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { PatientNotFoundError } from '@healthcare/shared/errors';

export async function registerLaboratoryModule(app: FastifyInstance) {
  app.get('/api/v1/lab/catalog', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const catalog = await db('lab_catalog').where({ tenant_id: tenantId, is_active: true }).orderBy('test_name');
    return sendSuccess(reply, catalog.map((c: any) => ({
      id: c.id, testCode: c.test_code, testName: c.test_name,
      category: c.category, specimenType: c.specimen_type,
      referenceRange: c.reference_range, unit: c.unit, price: Number(c.price),
    })));
  });

  app.post('/api/v1/lab/catalog', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = request.body as any;
    const [item] = await db('lab_catalog').insert({
      tenant_id: tenantId, test_code: body.testCode, test_name: body.testName,
      category: body.category, specimen_type: body.specimenType,
      reference_range: body.referenceRange, unit: body.unit, price: body.price || 0,
    }).returning('*');
    return sendSuccess(reply, item, 'Lab test added', 201);
  });

  app.get('/api/v1/lab/orders', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { status, patientId } = request.query as any;
    let q = db('lab_orders').where('lab_orders.tenant_id', tenantId).whereNull('lab_orders.deleted_at');
    if (status) q = q.andWhere('lab_orders.status', status);
    if (patientId) q = q.andWhere('lab_orders.patient_id', patientId);
    const orders = await q.join('patients', 'lab_orders.patient_id', 'patients.id')
      .select('lab_orders.*', 'patients.first_name as p_first', 'patients.last_name as p_last', 'patients.medical_record_number')
      .orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, orders.map(mapLabOrder));
  });

  app.post('/api/v1/lab/orders', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const ctx = getCtx(request);
    const body = request.body as any;
    const patient = await db('patients').where({ id: body.patientId, tenant_id: tenantId }).first();
    if (!patient) throw new PatientNotFoundError(body.patientId);
    const orderNum = "LAB-" + Date.now().toString(36).toUpperCase();
    const [order] = await db('lab_orders').insert({
      tenant_id: tenantId, patient_id: body.patientId, doctor_id: ctx.userId,
      appointment_id: body.appointmentId || null, order_number: orderNum,
      priority: body.priority || 'routine', order_date: new Date().toISOString().split('T')[0],
      clinical_notes: body.clinicalNotes, created_by: ctx.userId,
    }).returning('*');
    if (body.tests?.length) {
      const testRows = body.tests.map((t: any) => ({
        order_id: order.id, test_code: t.testCode || t.code, test_name: t.testName || t.name,
        specimen_type: t.specimenType, reference_range: t.referenceRange, result_unit: t.unit,
      }));
      await db('lab_tests').insert(testRows);
    }
    return sendSuccess(reply, { id: order.id, orderNumber: order.order_number }, 'Lab order created', 201);
  });

  app.put('/api/v1/lab/orders/:id/status', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    const update: any = { status: body.status, updated_at: new Date() };
    if (body.status === "collected") update.collected_at = new Date();
    if (body.status === "completed") update.completed_at = new Date();
    if (body.resultsSummary) update.results_summary = body.resultsSummary;
    await db('lab_orders').where({ id }).update(update);
    return sendSuccess(reply, null, "Lab order updated");
  });

  app.post('/api/v1/lab/orders/:id/results', { preHandler: [(r: any, rep: any) => (r.server as any).authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any;
    const { tests } = request.body as any;
    if (tests?.length) {
      for (const t of tests) {
        await db('lab_tests').where({ id: t.id }).update({ result_value: t.resultValue, status: t.status || 'completed', notes: t.notes });
      }
    }
    await db('lab_orders').where({ id }).update({ status: 'completed', completed_at: new Date(), updated_at: new Date() });
    return sendSuccess(reply, null, 'Results saved');
  });
}

function mapLabOrder(o: any) { return {
  id: o.id, orderNumber: o.order_number, patientId: o.patient_id,
  patientName: o.p_first + " " + o.p_last, patientMrn: o.medical_record_number,
  doctorId: o.doctor_id, status: o.status, priority: o.priority,
  orderDate: o.order_date, clinicalNotes: o.clinical_notes,
  resultsSummary: o.results_summary, collectedAt: o.collected_at,
  completedAt: o.completed_at, createdAt: o.created_at,
};}
