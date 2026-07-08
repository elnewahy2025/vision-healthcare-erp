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
