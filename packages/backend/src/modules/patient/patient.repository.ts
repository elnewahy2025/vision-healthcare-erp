import { db } from '../../core/database.js';
import type { PatientRow } from './types.js';

export async function findPatients(tenantId: string, options: {
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
  limit: number;
  offset: number;
}): Promise<{ patients: PatientRow[]; total: number }> {
  let query = db('patients')
    .where({ tenant_id: tenantId })
    .whereNull('deleted_at');

  if (options.search) {
    const s = options.search;
    query = query.andWhere(function () {
      this.where('first_name', 'ilike', `%${s}%`)
        .orWhere('last_name', 'ilike', `%${s}%`)
        .orWhere('phone', 'ilike', `%${s}%`)
        .orWhere('medical_record_number', 'ilike', `%${s}%`)
        .orWhere('email', 'ilike', `%${s}%`);
    });
  }

  if (options.status) {
    query = query.andWhere('status', options.status);
  }

  const total = await query.clone().count('id as count').first();
  const patients = await query
    .orderBy(options.sort || 'created_at', options.order || 'desc')
    .limit(options.limit)
    .offset(options.offset);

  return { patients, total: Number(total?.count || 0) };
}

export async function findPatientById(patientId: string, tenantId: string): Promise<PatientRow | undefined> {
  return db('patients')
    .where({ id: patientId, tenant_id: tenantId })
    .whereNull('deleted_at')
    .first();
}

export async function findPatientWithRelatedData(patientId: string, tenantId: string) {
  const patient = await findPatientById(patientId, tenantId);
  if (!patient) return null;

  const [appointments, emrRecords, invoices] = await Promise.all([
    db('appointments').where({ patient_id: patientId }).orderBy('appointment_date', 'desc').limit(5),
    db('emr_records').where({ patient_id: patientId }).orderBy('encounter_date', 'desc').limit(5),
    db('invoices').where({ patient_id: patientId }).orderBy('created_at', 'desc').limit(5),
  ]);

  return { patient, appointments, emrRecords, invoices };
}

export async function insertPatient(data: {
  tenantId: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email: string | null;
  nationality: string | null;
  bloodType: string | null;
  address: string | null;
  emergencyContact: string | null;
  locale: string;
  userId: string;
}): Promise<PatientRow> {
  const [patient] = await db('patients').insert({
    tenant_id: data.tenantId,
    medical_record_number: data.medicalRecordNumber,
    first_name: data.firstName,
    last_name: data.lastName,
    date_of_birth: data.dateOfBirth,
    gender: data.gender,
    phone: data.phone,
    email: data.email,
    nationality: data.nationality,
    blood_type: data.bloodType,
    address: data.address,
    emergency_contact: data.emergencyContact,
    status: 'active',
    preferred_language: data.locale,
    created_by: data.userId,
  }).returning('*');

  return patient;
}

export async function updatePatientById(patientId: string, updateData: Record<string, unknown>): Promise<PatientRow | undefined> {
  const [updated] = await db('patients')
    .where({ id: patientId })
    .update(updateData)
    .returning('*');
  return updated;
}

export async function softDeletePatient(patientId: string): Promise<void> {
  await db('patients').where({ id: patientId }).update({
    status: 'inactive',
    deleted_at: new Date(),
    updated_at: new Date(),
  });
}

export async function quickSearchPatients(tenantId: string, q: string): Promise<PatientRow[]> {
  return db('patients')
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
}
