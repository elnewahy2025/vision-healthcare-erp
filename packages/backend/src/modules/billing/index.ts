import { getCtx, getTenantId } from "../../utils/route-helper.js";
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../core/database.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { createInvoiceSchema, paginationSchema } from '../../utils/validation.js';
import { PatientNotFoundError } from '@healthcare/shared/errors';
import { generateInvoiceNumber } from '@healthcare/shared/utils';

export async function registerBillingModule(app: FastifyInstance) {
  // List invoices
  app.get('/api/v1/invoices', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const tenantId = getTenantId(request);
    const { status, patientId, startDate, endDate } = request.query as any;

    let queryBuilder = db('invoices')
      .join('patients', 'invoices.patient_id', 'patients.id')
      .where('invoices.tenant_id', tenantId)
      .whereNull('invoices.deleted_at');

    if (status) queryBuilder = queryBuilder.andWhere('invoices.status', status);
    if (patientId) queryBuilder = queryBuilder.andWhere('invoices.patient_id', patientId);
    if (startDate) queryBuilder = queryBuilder.andWhere('invoices.issued_at', '>=', startDate);
    if (endDate) queryBuilder = queryBuilder.andWhere('invoices.issued_at', '<=', endDate);

    const total = await queryBuilder.clone().count('invoices.id as count').first();
    const invoices = await queryBuilder
      .select(
        'invoices.*',
        'patients.first_name as patient_first_name',
        'patients.last_name as patient_last_name',
        'patients.medical_record_number',
      )
      .orderBy('invoices.created_at', query.order || 'desc')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    return sendPaginated(reply, invoices.map(mapInvoice), Number(total?.count || 0), query.page, query.limit);
  });

  // Get single invoice
  app.get('/api/v1/invoices/:invoiceId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { invoiceId } = request.params as any;
    const tenantId = getTenantId(request);

    const invoice = await db('invoices')
      .join('patients', 'invoices.patient_id', 'patients.id')
      .where('invoices.id', invoiceId)
      .where('invoices.tenant_id', tenantId)
      .select(
        'invoices.*',
        'patients.first_name as patient_first_name',
        'patients.last_name as patient_last_name',
        'patients.medical_record_number',
        'patients.phone as patient_phone',
        'patients.email as patient_email',
      )
      .first();

    if (!invoice) {
      return reply.status(404).send({ success: false, error: 'Invoice not found' });
    }

    return sendSuccess(reply, mapInvoice(invoice));
  });

  // Create invoice
  app.post('/api/v1/invoices', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const body = createInvoiceSchema.parse(request.body);
    const tenantId = getTenantId(request); const userId = getCtx(request).userId;

    const patient = await db('patients')
      .where({ id: body.patientId, tenant_id: tenantId })
      .first();
    if (!patient) throw new PatientNotFoundError(body.patientId);

    // Get tenant for invoice number
    const tenant = await db('tenants').where({ id: tenantId }).first();
    const invoiceNumber = generateInvoiceNumber(tenant?.slug || 'XX');

    const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = subtotal - body.discount + body.tax;

    const [invoice] = await db('invoices').insert({
      tenant_id: tenantId,
      patient_id: body.patientId,
      appointment_id: body.appointmentId || null,
      invoice_number: invoiceNumber,
      items: JSON.stringify(body.items),
      subtotal,
      discount: body.discount,
      tax: body.tax,
      total,
      paid: 0,
      due: total,
      status: 'pending',
      due_date: body.dueDate,
      issued_at: new Date().toISOString(),
      notes: body.notes || null,
      insurance_claim: body.insuranceClaim || null,
      created_by: userId,
    }).returning('*');

    return sendSuccess(reply, mapInvoice(invoice), 'Invoice created', 201);
  });

  // Record payment
  app.post('/api/v1/invoices/:invoiceId/pay', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { invoiceId } = request.params as any;
    const tenantId = getTenantId(request);

    const body = z.object({
      amount: z.number().positive(),
      method: z.enum(['cash', 'card', 'insurance', 'bank_transfer', 'online', 'wallet']),
      notes: z.string().optional(),
    }).parse(request.body);

    const invoice = await db('invoices')
      .where({ id: invoiceId, tenant_id: tenantId })
      .first();
    if (!invoice) {
      return reply.status(404).send({ success: false, error: 'Invoice not found' });
    }

    const newPaid = Number(invoice.paid) + body.amount;
    const newDue = Number(invoice.total) - newPaid;
    let newStatus = invoice.status;

    if (newDue <= 0) {
      newStatus = 'paid';
    } else if (newPaid > 0) {
      newStatus = 'partial';
    }

    const [updated] = await db('invoices')
      .where({ id: invoiceId })
      .update({
        paid: newPaid,
        due: newDue,
        status: newStatus,
        payment_method: body.method,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date(),
      })
      .returning('*');

    // Record payment transaction
    await db('payment_transactions').insert({
      tenant_id: tenantId,
      invoice_id: invoiceId,
      amount: body.amount,
      method: body.method,
      notes: body.notes || null,
      status: 'completed',
    });

    return sendSuccess(reply, mapInvoice(updated), 'Payment recorded');
  });

  // Get revenue summary
  app.get('/api/v1/billing/revenue', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { startDate, endDate } = request.query as any;

    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const revenue = await db('invoices')
      .where('tenant_id', tenantId)
      .whereNull('deleted_at')
      .whereBetween('issued_at', [start, end])
      .select(
        db.raw('COALESCE(SUM(total), 0) as total_revenue'),
        db.raw('COALESCE(SUM(paid), 0) as total_collected'),
        db.raw('COALESCE(SUM(due), 0) as total_pending'),
        db.raw('COUNT(*) as invoice_count'),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as paid_count', ['paid']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as pending_count', ['pending']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as overdue_count', ['overdue']),
      )
      .first();

    return sendSuccess(reply, {
      period: { start, end },
      ...revenue,
    });
  });

  // Get patient invoices
  app.get('/api/v1/patients/:patientId/invoices', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { patientId } = request.params as any;
    const tenantId = getTenantId(request);
    const query = paginationSchema.parse(request.query);

    const invoices = await db('invoices')
      .where({ patient_id: patientId, tenant_id: tenantId })
      .whereNull('deleted_at')
      .orderBy('created_at', query.order || 'desc')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const total = await db('invoices')
      .where({ patient_id: patientId, tenant_id: tenantId })
      .whereNull('deleted_at')
      .count('id as count')
      .first();

    return sendPaginated(reply, invoices.map(mapInvoice), Number(total?.count || 0), query.page, query.limit);
  });
}

function mapInvoice(i: any) {
  return {
    id: i.id,
    tenantId: i.tenant_id,
    patientId: i.patient_id,
    appointmentId: i.appointment_id,
    invoiceNumber: i.invoice_number,
    items: i.items ? (typeof i.items === 'string' ? JSON.parse(i.items) : i.items) : [],
    subtotal: Number(i.subtotal),
    discount: Number(i.discount),
    tax: Number(i.tax),
    total: Number(i.total),
    paid: Number(i.paid),
    due: Number(i.due),
    status: i.status,
    paymentMethod: i.payment_method,
    insuranceClaim: i.insurance_claim,
    notes: i.notes,
    dueDate: i.due_date,
    issuedAt: i.issued_at,
    paidAt: i.paid_at,
    patientName: i.patient_first_name && i.patient_last_name ? `${i.patient_first_name} ${i.patient_last_name}` : undefined,
    patientMrn: i.medical_record_number,
    patientPhone: i.patient_phone,
    patientEmail: i.patient_email,
    createdAt: i.created_at,
    updatedAt: i.updated_at,
  };
}
