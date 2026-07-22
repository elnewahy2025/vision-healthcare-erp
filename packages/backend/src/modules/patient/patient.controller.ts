import type { FastifyRequest, FastifyReply } from 'fastify';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { createPatientSchema, updatePatientSchema, paginationSchema } from '../../utils/validation.js';
import { PatientNotFoundError } from '@healthcare/shared/errors';
import { generateMedicalRecordNumber } from '@healthcare/shared/utils';
import * as repo from './patient.repository.js';
import { mapPatient } from './patient.mapper.js';
import type { PatientRow, QuickSearchResult } from './types.js';

export async function listPatients(request: FastifyRequest, reply: FastifyReply) {
  const query = paginationSchema.parse(request.query);
  const tenantId = getTenantId(request);
  const search = (request.query as Record<string, unknown>).search as string | undefined;
  const status = (request.query as Record<string, unknown>).status as string | undefined;

  const { patients, total } = await repo.findPatients(tenantId, {
    search, status, sort: query.sort, order: query.order,
    limit: query.limit, offset: (query.page - 1) * query.limit,
  });

  return sendPaginated(reply, patients.map(mapPatient), total, query.page, query.limit);
}

export async function getPatient(request: FastifyRequest, reply: FastifyReply) {
  const { patientId } = request.params as { patientId: string };
  const tenantId = getTenantId(request);

  const data = await repo.findPatientWithRelatedData(patientId, tenantId);
  if (!data) throw new PatientNotFoundError(patientId);

  return sendSuccess(reply, {
    ...mapPatient(data.patient),
    recentAppointments: data.appointments || [],
    recentEmrRecords: data.emrRecords || [],
    recentInvoices: data.invoices || [],
  });
}

export async function createPatient(request: FastifyRequest, reply: FastifyReply) {
  const body = createPatientSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId, locale } = getCtx(request);
  const mrn = generateMedicalRecordNumber();

  const patient = await repo.insertPatient({
    tenantId, medicalRecordNumber: mrn,
    firstName: body.firstName, lastName: body.lastName,
    dateOfBirth: body.dateOfBirth, gender: body.gender,
    phone: body.phone, email: body.email || null,
    nationality: body.nationality || null, bloodType: body.bloodType || null,
    address: body.address ? JSON.stringify(body.address) : null,
    emergencyContact: body.emergencyContact ? JSON.stringify(body.emergencyContact) : null,
    locale: locale || 'en', userId,
  });

  return sendSuccess(reply, mapPatient(patient), 'Patient created successfully', 201);
}

export async function updatePatient(request: FastifyRequest, reply: FastifyReply) {
  const { patientId } = request.params as { patientId: string };
  const body = updatePatientSchema.parse(request.body);
  const tenantId = getTenantId(request);

  const existing = await repo.findPatientById(patientId, tenantId);
  if (!existing) throw new PatientNotFoundError(patientId);

  const updateData: Record<string, unknown> = {};
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

  const updated = await repo.updatePatientById(patientId, updateData);
  return sendSuccess(reply, mapPatient(updated!), 'Patient updated successfully');
}

export async function deletePatient(request: FastifyRequest, reply: FastifyReply) {
  const { patientId } = request.params as { patientId: string };
  const tenantId = getTenantId(request);

  const existing = await repo.findPatientById(patientId, tenantId);
  if (!existing) throw new PatientNotFoundError(patientId);

  await repo.softDeletePatient(patientId);
  return sendSuccess(reply, null, 'Patient deleted successfully');
}

export async function quickSearch(request: FastifyRequest, reply: FastifyReply) {
  const { q } = request.query as { q?: string };
  const tenantId = getTenantId(request);

  if (!q || q.length < 2) return sendSuccess(reply, []);

  const patients = await repo.quickSearchPatients(tenantId, q);
  const results: QuickSearchResult[] = patients.map((p: PatientRow) => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`,
    mrn: p.medical_record_number,
    phone: p.phone,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
  }));

  return sendSuccess(reply, results);
}
