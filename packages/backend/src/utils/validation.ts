import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const patientIdSchema = z.object({
  patientId: z.string().uuid(),
});

export const appointmentIdSchema = z.object({
  appointmentId: z.string().uuid(),
});

export const createPatientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female']),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  nationality: z.string().optional(),
  bloodType: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string(),
    relation: z.string(),
    phone: z.string(),
  }).optional(),
  notes: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  branchId: z.string().uuid(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  duration: z.number().int().positive().default(15),
  type: z.enum(['consultation', 'followup', 'emergency', 'checkup', 'procedure', 'telemedicine', 'vaccination']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  isWalkIn: z.boolean().default(false),
  isVirtual: z.boolean().default(false),
});

export const updateAppointmentSchema = createAppointmentSchema.partial();

export const createEmrSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  encounterDate: z.string(),
  encounterType: z.enum(['new', 'followup', 'emergency', 'annual', 'preoperative', 'postoperative', 'telemedicine']),
  chiefComplaint: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  vitals: z.object({
    bloodPressureSystolic: z.number(),
    bloodPressureDiastolic: z.number(),
    heartRate: z.number(),
    respiratoryRate: z.number(),
    temperature: z.number(),
    oxygenSaturation: z.number(),
    height: z.number(),
    weight: z.number(),
    painLevel: z.number().min(0).max(10),
  }).optional(),
  notes: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  appointmentId: z.string().uuid().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    code: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    type: z.enum(['consultation', 'procedure', 'medication', 'laboratory', 'radiology', 'supply', 'other']),
  })).min(1),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  dueDate: z.string(),
  notes: z.string().optional(),
  insuranceClaim: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
  mfaCode: z.string().optional(),
});

// Queue validation
export const createQueueEntrySchema = z.object({
  patientId: z.string().uuid(),
  serviceType: z.string().min(1).max(50),
  priority: z.number().int().min(0).max(2).default(0),
});

// Nursing validation
export const createNursingTaskSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['general', 'medication', 'vitals', 'wound_care', 'patient_education', 'discharge']).default('general'),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  dueAt: z.string().optional(),
});

// Home Visits validation
export const createHomeVisitSchema = z.object({
  patientId: z.string().uuid(),
  visitType: z.enum(['checkup', 'followup', 'emergency', 'vaccination', 'physiotherapy']).default('checkup'),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  address: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

// Telemedicine validation
export const createTelemedicineSessionSchema = z.object({
  patientId: z.string().uuid(),
  provider: z.enum(['internal', 'zoom', 'teams', 'other']).default('internal'),
  meetingLink: z.string().url().optional().or(z.literal('')),
  recordingEnabled: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

// Laboratory validation
export const createLabOrderSchema = z.object({
  patientId: z.string().uuid(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  clinicalNotes: z.string().max(2000).optional(),
  tests: z.array(z.object({
    testCode: z.string(),
    testName: z.string(),
    specimenType: z.string().optional(),
    referenceRange: z.string().optional(),
    unit: z.string().optional(),
  })).min(1),
});

// Radiology validation
export const createRadiologyOrderSchema = z.object({
  patientId: z.string().uuid(),
  studyType: z.string().min(1).max(100),
  bodyPart: z.string().max(100).optional(),
  priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  clinicalIndication: z.string().max(2000).optional(),
});

// Pharmacy validation
export const createDrugSchema = z.object({
  drugName: z.string().min(1).max(200),
  genericName: z.string().max(200).optional(),
  brandName: z.string().max(200).optional(),
  dosageForm: z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler']).default('tablet'),
  strength: z.string().max(50).optional(),
  stockQuantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  unitPrice: z.number().min(0).default(0),
  batchNumber: z.string().max(50).optional(),
  expiryDate: z.string().optional(),
  manufacturer: z.string().max(200).optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  items: z.array(z.object({
    drugName: z.string().min(1),
    dosage: z.string().optional(),
    route: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    quantity: z.number().int().min(1).default(1),
    refills: z.number().int().min(0).default(0),
    instructions: z.string().optional(),
  })).min(1),
});

// Referral validation
export const createReferralSchema = z.object({
  patientId: z.string().uuid(),
  referralType: z.enum(['specialist', 'general', 'internal', 'external']).default('specialist'),
  priority: z.enum(['normal', 'urgent', 'emergency']).default('normal'),
  reason: z.string().min(1).max(2000),
  clinicalNotes: z.string().max(2000).optional(),
  externalFacility: z.string().max(200).optional(),
  externalDoctor: z.string().max(200).optional(),
  consentObtained: z.boolean().default(true),
});
