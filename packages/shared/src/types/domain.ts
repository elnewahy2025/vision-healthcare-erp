export interface Patient {
  id: string;
  tenantId: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  nationality?: string;
  bloodType?: string;
  email?: string;
  phone: string;
  phone2?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
  insurance?: PatientInsurance[];
  allergies?: Allergy[];
  medicalHistory?: MedicalHistoryEntry[];
  maritalStatus?: string;
  occupation?: string;
  preferredLanguage: 'ar' | 'en';
  profileImage?: string;
  status: PatientStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface PatientInsurance {
  provider: string;
  policyNumber: string;
  planName: string;
  startDate: string;
  endDate: string;
  coverage: number;
  status: 'active' | 'expired' | 'pending';
}

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction: string;
  recordedAt: string;
}

export interface MedicalHistoryEntry {
  condition: string;
  diagnosisDate?: string;
  status: 'active' | 'resolved' | 'managed';
  notes?: string;
}

export type PatientStatus = 'active' | 'inactive' | 'deceased' | 'transferred';

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  doctorId: string;
  branchId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  isWalkIn: boolean;
  isVirtual: boolean;
  telemedicineLink?: string;
  reminderSent: boolean;
  reminders: AppointmentReminder[];
  checkInTime?: string;
  checkOutTime?: string;
  cancelledAt?: string;
  cancelReason?: string;
  rescheduledFrom?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentType =
  | 'consultation' | 'followup' | 'emergency'
  | 'checkup' | 'procedure' | 'telemedicine'
  | 'vaccination';

export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'checked_in'
  | 'in_progress' | 'completed' | 'cancelled'
  | 'no_show' | 'rescheduled';

export interface AppointmentReminder {
  type: 'sms' | 'email' | 'whatsapp' | 'push';
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
}

export interface EMRRecord {
  id: string;
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  doctorId: string;
  encounterDate: string;
  encounterType: EncounterType;
  chiefComplaint?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis: Diagnosis[];
  procedures: Procedure[];
  medications: PrescribedMedication[];
  labOrders: string[];
  radiologyOrders: string[];
  vitals?: Vitals;
  notes?: string;
  status: EMRStatus;
  createdAt: string;
  updatedAt: string;
}

export type EncounterType =
  | 'new' | 'followup' | 'emergency' | 'annual'
  | 'preoperative' | 'postoperative' | 'telemedicine';

export type EMRStatus = 'draft' | 'completed' | 'signed' | 'amended';

export interface Diagnosis {
  code: string;
  name: string;
  type: 'primary' | 'secondary' | 'complication';
  notes?: string;
}

export interface Procedure {
  code: string;
  name: string;
  date: string;
  notes?: string;
}

export interface PrescribedMedication {
  drugName: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions?: string;
  prescribedAt: string;
}

export interface Vitals {
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
  oxygenSaturation: number;
  height: number;
  weight: number;
  bmi: number;
  painLevel: number;
  recordedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  patientId: string;
  appointmentId?: string;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  due: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  insuranceClaim?: string;
  notes?: string;
  dueDate: string;
  issuedAt: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  code: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'consultation' | 'procedure' | 'medication' | 'laboratory' | 'radiology' | 'supply' | 'other';
}

export type InvoiceStatus =
  | 'draft' | 'pending' | 'partial' | 'paid'
  | 'cancelled' | 'refunded' | 'overdue';

export type PaymentMethod =
  | 'cash' | 'card' | 'insurance' | 'bank_transfer' | 'online' | 'wallet';

export interface Branch {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: Address;
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  timezone: string;
  createdAt: string;
  updatedAt: string;
}
