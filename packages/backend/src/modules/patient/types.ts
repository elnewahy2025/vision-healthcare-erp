export interface PatientRow {
  id: string;
  tenant_id: string;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string | null;
  blood_type: string | null;
  email: string | null;
  phone: string;
  phone2: string | null;
  address: string | null;
  emergency_contact: string | null;
  preferred_language: string | null;
  status: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string | null;
}

export interface PatientResponse {
  id: string;
  tenantId: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string | null;
  bloodType: string | null;
  email: string | null;
  phone: string;
  phone2: string | null;
  address?: Record<string, unknown>;
  emergencyContact?: Record<string, unknown>;
  preferredLanguage: string | null;
  status: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface QuickSearchResult {
  id: string;
  name: string;
  mrn: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
}
