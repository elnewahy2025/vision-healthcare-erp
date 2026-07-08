import { getCtx, getTenantId } from "../../utils/route-helper.js";
import type { FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { createPatientSchema, updatePatientSchema, paginationSchema } from '../../utils/validation.js';
import { PatientNotFoundError } from '@healthcare/shared/errors';
import { generateMedicalRecordNumber } from '@healthcare/shared/utils';

export async function registerPatientModule(app: FastifyInstance) {

  // List patients (with search & pagination)
  app.get('/api/v1/patients', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const tenantId = getTenantId(request);
    const search = (request.query as any).search as string;
    const status = (request.query as any).status as string;

    let queryBuilder = db('patients')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at');

    if (search) {
      queryBuilder = queryBuilder.andWhere(function () {
        this.where('first_name', 'ilike', `%${search}%`)
          .orWhere('last_name', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`)
          .orWhere('medical_record_number', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
      });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('status', status);
    }

    const total = await queryBuilder.clone().count('id as count').first();
    const patients = await queryBuilder
      .orderBy(query.sort || 'created_at', query.order || 'desc')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const mapped = patients.map(mapPatient);

    return sendPaginated(reply, mapped, Number(total?.count || 0), query.page, query.limit);
  });

  // Get single patient
  app.get('/api/v1/patients/:patientId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { patientId } = request.params as any;
    const tenantId = getTenantId(request);

    const patient = await db('patients')
      .where({ id: patientId, tenant_id: tenantId })
      .whereNull('deleted_at')
      .first();

    if (!patient) throw new PatientNotFoundError(patientId);

    // Get related data
    const appointments = await db('appointments')
      .where({ patient_id: patientId })
      .orderBy('appointment_date', 'desc')
      .limit(5);

    const emrRecords = await db('emr_records')
      .where({ patient_id: patientId })
      .orderBy('encounter_date', 'desc')
      .limit(5);

    const invoices = await db('invoices')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'desc')
      .limit(5);

    return sendSuccess(reply, {
      ...mapPatient(patient),
      recentAppointments: appointments || [],
      recentEmrRecords: emrRecords || [],
      recentInvoices: invoices || [],
    });
  });

  // Create patient
  app.post('/api/v1/patients', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const body = createPatientSchema.parse(request.body);
    const tenantId = getTenantId(request); const userId = getCtx(request).userId;

    const mrn = generateMedicalRecordNumber();

    const [patient] = await db('patients').insert({
      tenant_id: tenantId,
      medical_record_number: mrn,
      first_name: body.firstName,
      last_name: body.lastName,
      date_of_birth: body.dateOfBirth,
      gender: body.gender,
      phone: body.phone,
      email: body.email || null,
      nationality: body.nationality || null,
      blood_type: body.bloodType || null,
      address: body.address ? JSON.stringify(body.address) : null,
      emergency_contact: body.emergencyContact ? JSON.stringify(body.emergencyContact) : null,
      status: 'active',
      preferred_language: getCtx(request).locale || "en" || 'en',
      created_by: userId,
    }).returning('*');

    return sendSuccess(reply, mapPatient(patient), 'Patient created successfully', 201);
  });

  // Update patient
  app.put('/api/v1/patients/:patientId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { patientId } = request.params as any;
    const body = updatePatientSchema.parse(request.body);
    const tenantId = getTenantId(request);

    const existing = await db('patients')
      .where({ id: patientId, tenant_id: tenantId })
      .first();
    if (!existing) throw new PatientNotFoundError(patientId);

    const updateData: any = {};
    if (body.firstName !== undefined) updateData.first_name = body.firstName;
    if (body.lastName !== undefined) updateData.last_name = body.lastName;
    if (body.dateOfBirth !== undefined) updateData.date_of_birth = body.dateOfBirth;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.bloodType !== undefined) updateData.blood_type = body.bloodType;
    if (body.address !== undefined) updateData.address = JSON.stringify(body.address);
    if (body.emergencyContact !== undefined) updateData.emergency_contact = JSON.stringify(body.emergencyContact);
    updateData.updated_at = new Date();

    const [updated] = await db('patients')
      .where({ id: patientId })
      .update(updateData)
      .returning('*');

    return sendSuccess(reply, mapPatient(updated), 'Patient updated successfully');
  });

  // Delete patient (soft delete)
  app.delete('/api/v1/patients/:patientId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { patientId } = request.params as any;
    const tenantId = getTenantId(request);

    const existing = await db('patients')
      .where({ id: patientId, tenant_id: tenantId })
      .first();
    if (!existing) throw new PatientNotFoundError(patientId);

    await db('patients').where({ id: patientId }).update({
      status: 'inactive',
      deleted_at: new Date(),
      updated_at: new Date(),
    });

    return sendSuccess(reply, null, 'Patient deleted successfully');
  });

  // Search patients (for autocomplete)
  app.get('/api/v1/patients/search/quick', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { q } = request.query as any;
    const tenantId = getTenantId(request);

    if (!q || q.length < 2) return sendSuccess(reply, []);

    const patients = await db('patients')
      .where({ tenant_id: tenantId })
      .whereNull('deleted_at')
      .where(function () {
        this.where('first_name', 'ilike', `%${q}%`)
          .orWhere('last_name', 'ilike', `%${q}%`)
          .orWhere('phone', 'ilike', `%${q}%`)
          .orWhere('medical_record_number', 'ilike', `%${q}%`);
      })
      .select('id', 'first_name', 'last_name', 'medical_record_number', 'phone', 'date_of_birth', 'gender')
      .limit(10);

    return sendSuccess(reply, patients.map((p: any) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      mrn: p.medical_record_number,
      phone: p.phone,
      dateOfBirth: p.date_of_birth,
      gender: p.gender,
    })));
  });
}

function mapPatient(p: any) {
  return {
    id: p.id,
    tenantId: p.tenant_id,
    medicalRecordNumber: p.medical_record_number,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    nationality: p.nationality,
    bloodType: p.blood_type,
    email: p.email,
    phone: p.phone,
    phone2: p.phone2,
    address: p.address ? (typeof p.address === 'string' ? JSON.parse(p.address) : p.address) : undefined,
    emergencyContact: p.emergency_contact ? (typeof p.emergency_contact === 'string' ? JSON.parse(p.emergency_contact) : p.emergency_contact) : undefined,
    preferredLanguage: p.preferred_language,
    status: p.status,
    tags: p.tags || [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
