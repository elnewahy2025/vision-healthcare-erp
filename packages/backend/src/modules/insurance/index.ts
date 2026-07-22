import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { authenticate } from '../auth-guard.js';

export async function registerInsuranceModule(app: FastifyInstance) {
  // Insurance Companies
  app.get('/api/v1/insurance/companies', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const companies = await db('insurance_companies').where({ tenant_id: tenantId, is_active: true }).orderBy('name');
    return sendSuccess(reply, companies.map((c: any) => ({ id: c.id, name: c.name, code: c.code, contractType: c.contract_type, discountRate: Number(c.discount_rate), coveragePlans: c.coverage_plans })));
  });

  app.post('/api/v1/insurance/companies', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const body = request.body as any;
    const [co] = await db('insurance_companies').insert({ tenant_id: tenantId, name: body.name, code: body.code, contract_type: body.contractType || 'network', discount_rate: body.discountRate || 0 }).returning('*');
    return sendSuccess(reply, { id: co.id, name: co.name }, 'Insurance company added', 201);
  });

  // Claims
  app.get('/api/v1/insurance/claims', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const { status, patientId } = request.query as any;
    let q = db('insurance_claims').where('insurance_claims.tenant_id', tenantId).whereNull('insurance_claims.deleted_at');
    if (status) q = q.andWhere('insurance_claims.status', status);
    if (patientId) q = q.andWhere('insurance_claims.patient_id', patientId);
    const rows = await q.join('patients', 'insurance_claims.patient_id', 'patients.id').leftJoin('insurance_companies', 'insurance_claims.insurance_id', 'insurance_companies.id')
      .select('insurance_claims.*', 'patients.first_name as pf', 'patients.last_name as pl', 'insurance_companies.name as ins_name').orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, rows.map((r: any) => ({ id: r.id, claimNumber: r.claim_number, patientId: r.patient_id, patientName: r.pf + ' ' + r.pl, insuranceId: r.insurance_id, insuranceName: r.ins_name, status: r.status, claimedAmount: Number(r.claimed_amount), approvedAmount: Number(r.approved_amount), paidAmount: Number(r.paid_amount), submissionDate: r.submission_date, responseDate: r.response_date, denialReason: r.denial_reason, notes: r.notes, createdAt: r.created_at })));
  });

  app.post('/api/v1/insurance/claims', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const tenantId = getTenantId(request); const ctx = getCtx(request); const body = request.body as any;
    const claimNum = "CLM-" + Date.now().toString(36).toUpperCase();
    const [claim] = await db('insurance_claims').insert({ tenant_id: tenantId, patient_id: body.patientId, invoice_id: body.invoiceId || null, insurance_id: body.insuranceId, claim_number: claimNum, claimed_amount: body.claimedAmount || 0, created_by: ctx.userId }).returning('*');
    return sendSuccess(reply, { id: claim.id, claimNumber: claim.claim_number }, 'Claim created', 201);
  });

  app.put('/api/v1/insurance/claims/:id', { preHandler: [(r: FastifyRequest, rep: FastifyReply) => authenticate(r, rep)] }, async (request, reply) => {
    const { id } = request.params as any; const body = request.body as any;
    const update: any = { updated_at: new Date() };
    if (body.status) update.status = body.status; if (body.approvedAmount !== undefined) update.approved_amount = body.approvedAmount;
    if (body.paidAmount !== undefined) update.paid_amount = body.paidAmount; if (body.denialReason) update.denial_reason = body.denialReason;
    if (body.notes) update.notes = body.notes;
    if (body.status === 'submitted') update.submission_date = new Date().toISOString().split('T')[0];
    if (body.status === 'approved' || body.status === 'denied' || body.status === 'paid') update.response_date = new Date().toISOString().split('T')[0];
    await db('insurance_claims').where({ id }).update(update);
    return sendSuccess(reply, null, 'Claim updated');
  });
}
