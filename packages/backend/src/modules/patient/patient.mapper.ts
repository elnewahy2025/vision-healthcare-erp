import type { PatientRow, PatientResponse } from './types.js';
import { decryptField } from '@healthcare/shared/utils';

export function mapPatient(p: PatientRow): PatientResponse {
  let decryptedNationalId: string | null = null;
  if (p.national_id) {
    try {
      decryptedNationalId = decryptField(p.national_id);
    } catch {
      // Value may be plaintext from before encryption was added
      decryptedNationalId = p.national_id;
    }
  }

  return {
    id: p.id,
    tenantId: p.tenant_id,
    medicalRecordNumber: p.medical_record_number,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: p.date_of_birth,
    gender: p.gender,
    nationalId: decryptedNationalId,
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
