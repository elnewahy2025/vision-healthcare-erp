import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db } from '../../core/database.js';
import { sendSuccess } from '../../utils/response.js';

// Portal endpoints use patient OTP auth, not staff JWT
export async function registerPatientPortalModule(app: FastifyInstance) {
  // ── OTP Login (request) ──
  app.post('/api/v1/portal/login', async (request, reply) => {
    const { phone, tenantSlug } = request.body as any;
    if (!phone || !tenantSlug) return reply.status(400).send({ success: false, error: 'Phone and tenant slug required' });

    const tenant = await db('tenants').where({ slug: tenantSlug, status: 'active' }).first();
    if (!tenant) return reply.status(404).send({ success: false, error: 'Organization not found' });

    const patient = await db('patients').where({ tenant_id: tenant.id, phone }).whereNull('deleted_at').first();
    if (!patient) return reply.status(404).send({ success: false, error: 'Patient not found with this phone' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db('portal_sessions').insert({
      patient_id: patient.id, token, otp, otp_expires_at: expiresAt,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      ip_address: request.ip, user_agent: request.headers['user-agent'] || null,
    });

    // In production, send OTP via SMS
    console.log(`[PORTAL OTP] Patient ${patient.id}: ${otp}`);

    return sendSuccess(reply, {
      message: 'OTP sent to your phone',
      token, // In production, don't return OTP in response
      otp, // Development convenience
      expiresIn: 600,
    }, 'OTP sent', 200);
  });

  // ── Verify OTP ──
  app.post('/api/v1/portal/verify', async (request, reply) => {
    const { token, otp } = request.body as any;
    const session = await db('portal_sessions').where({ token, otp })
      .where('otp_expires_at', '>', new Date())
      .where('expires_at', '>', new Date())
      .first();
    if (!session) return reply.status(401).send({ success: false, error: 'Invalid or expired OTP' });

    const patient = await db('patients').where({ id: session.patient_id }).whereNull('deleted_at').first();
    if (!patient) return reply.status(404).send({ success: false, error: 'Patient not found' });

    const accessToken = crypto.randomBytes(64).toString('hex');
    await db('portal_sessions').where({ id: session.id }).update({
      otp: null, otp_expires_at: null, last_activity_at: new Date(),
    });

    return sendSuccess(reply, {
      accessToken,
      patient: {
        id: patient.id, firstName: patient.first_name, lastName: patient.last_name,
        email: patient.email, phone: patient.phone, dateOfBirth: patient.date_of_birth,
        gender: patient.gender, medicalRecordNumber: patient.medical_record_number,
      },
      tenantId: patient.tenant_id,
    });
  });

  // ── Portal Auth Middleware ──
  async function portalAuth(request: any, reply: any) {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    const token = auth.slice(7);
    const session = await db('portal_sessions').where({ token }).where('expires_at', '>', new Date()).first();
    if (!session) return reply.status(401).send({ success: false, error: 'Session expired' });
    await db('portal_sessions').where({ id: session.id }).update({ last_activity_at: new Date() });
    request.patientId = session.patient_id;
    request.portalSession = session;
  }

  // ── Patient Dashboard ──
  app.get('/api/v1/portal/dashboard', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const patient = await db('patients').where({ id: patientId }).first();

    const upcomingAppts = await db('appointments').where({ patient_id: patientId })
      .whereIn('status', ['scheduled', 'confirmed']).where('appointment_date', '>=', new Date().toISOString().split('T')[0])
      .orderBy('appointment_date').limit(5);

    const recentRecords = await db('emr_records').where({ patient_id: patientId })
      .orderBy('created_at', 'desc').limit(5);

    const recentInvoices = await db('invoices').where({ patient_id: patientId, status: 'pending' })
      .orWhere({ patient_id: patientId, status: 'partial' })
      .orderBy('created_at', 'desc').limit(5);

    const unreadMessages = await db('patient_messages').where({ patient_id: patientId, direction: 'outbound', is_read: false }).count('id as c').first();

    return sendSuccess(reply, {
      patient: patient ? { id: patient.id, firstName: patient.first_name, lastName: patient.last_name, medicalRecordNumber: patient.medical_record_number } : null,
      upcomingAppointments: upcomingAppts.map((a: any) => ({ id: a.id, date: a.appointment_date, time: a.start_time, type: a.appointment_type, status: a.status, doctorId: a.doctor_id, branchId: a.branch_id })),
      recentRecords: recentRecords.map((r: any) => ({ id: r.id, diagnosis: r.diagnosis?.substring(0, 100), createdAt: r.created_at })),
      pendingBills: recentInvoices.map((i: any) => ({ id: i.id, invoiceNumber: i.invoice_number, total: Number(i.total), dueAmount: Number(i.total) - Number(i.paid), dueDate: i.due_date })),
      unreadMessages: Number((unreadMessages as any)?.c || 0),
    });
  });

  // ── My Appointments ──
  app.get('/api/v1/portal/appointments', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const { status } = request.query as any;
    let q = db('appointments').where({ patient_id: patientId });
    if (status) q = q.andWhere('status', status);
    const appointments = await q.orderBy('appointment_date', 'desc').limit(50);
    return sendSuccess(reply, appointments.map((a: any) => ({
      id: a.id, date: a.appointment_date, time: a.start_time, endTime: a.end_time,
      type: a.appointment_type, status: a.status, reason: a.reason,
      doctorId: a.doctor_id, branchId: a.branch_id, notes: a.notes,
    })));
  });

  // ── My Medical Records ──
  app.get('/api/v1/portal/records', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const records = await db('emr_records').where({ patient_id: patientId })
      .orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, records.map((r: any) => ({
      id: r.id, diagnosis: r.diagnosis, symptoms: r.symptoms,
      treatment: r.treatment, notes: r.notes, doctorId: r.doctor_id,
      encounterDate: r.encounter_date, createdAt: r.created_at,
    })));
  });

  // ── My Bills ──
  app.get('/api/v1/portal/bills', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const invoices = await db('invoices').where({ patient_id: patientId })
      .orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, invoices.map((i: any) => ({
      id: i.id, invoiceNumber: i.invoice_number, items: i.items,
      subtotal: Number(i.subtotal), discount: Number(i.discount),
      tax: Number(i.tax), total: Number(i.total),
      paid: Number(i.paid), dueAmount: Number(i.total) - Number(i.paid),
      status: i.status, dueDate: i.due_date, issuedAt: i.issued_at,
    })));
  });

  // ── Shared Documents ──
  app.get('/api/v1/portal/documents', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const docs = await db('patient_shared_documents').where({ patient_id: patientId })
      .orderBy('shared_at', 'desc').limit(50);
    return sendSuccess(reply, docs.map((d: any) => ({
      id: d.id, title: d.title, fileName: d.file_name,
      fileType: d.file_type, category: d.category,
      notes: d.notes, sharedAt: d.shared_at,
      isAcknowledged: d.is_acknowledged
    })));
  });

  // ── My Messages ──
  app.get('/api/v1/portal/messages', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const messages = await db('patient_messages').where({ patient_id: patientId })
      .orderBy('created_at', 'desc').limit(50);
    return sendSuccess(reply, messages.map((m: any) => ({
      id: m.id, subject: m.subject, body: m.body,
      direction: m.direction, isRead: m.is_read,
      createdAt: m.created_at,
    })));
  });

  app.post('/api/v1/portal/messages', { preHandler: portalAuth }, async (request, reply) => {
    const patientId = (request as any).patientId;
    const body = request.body as any;
    const [msg] = await db('patient_messages').insert({
      patient_id: patientId, direction: 'inbound',
      subject: body.subject || 'General Inquiry', body: body.message
    }).returning('*');
    return sendSuccess(reply, { id: msg.id }, 'Message sent', 201);
  });

  // ── Portal Logout ──
  app.post('/api/v1/portal/logout', { preHandler: portalAuth }, async (request, reply) => {
    await db('portal_sessions').where({ id: (request as any).portalSession.id }).del();
    return sendSuccess(reply, null, 'Logged out');
  });
}
