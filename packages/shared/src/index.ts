export type {
  Patient, Address, EmergencyContact, PatientInsurance,
  Allergy, MedicalHistoryEntry, PatientStatus,
  Appointment, AppointmentType, AppointmentStatus, AppointmentReminder,
  EMRRecord, EncounterType, EMRStatus, Diagnosis, Procedure,
  PrescribedMedication as Medication, Vitals,
  Invoice, InvoiceItem, InvoiceStatus, PaymentMethod,
  Branch,
} from './types/domain';

export type {
  ApiResponse, PaginationParams, PaginatedResponse,
  AuditLog,
} from './types/api';
export type { ApiValidationError } from './types/api';

export type {
  User, UserStatus, Role, Permission,
  AuthTokens, LoginRequest, LoginResponse,
} from './types/auth';

export {
  PERMISSIONS,
} from './types/auth';

export type {
  TenantInfo, CreateTenantRequest, TenantStatus,
} from './types/multi-tenancy';

export {
  APP_NAME, APP_VERSION, PAGINATION, PASSWORD, JWT,
  DATE_FORMATS, CURRENCIES, BLOOD_TYPES, GENDERS, APPOINTMENT_TYPES,
} from './config/constants';

export { getEnv } from './config/environment';
export type { Environment } from './config/environment';

export {
  generateId, generateMedicalRecordNumber, generateInvoiceNumber,
  hashString, slugify, maskEmail, generateOtp,
} from './utils/crypto';

export {
  isValidEmail, isValidPhone, isValidMrn, isValidDate,
  isValidBloodType, isValidIcd10Code, isStrongPassword,
} from './utils/validators';

export {
  formatCurrency, formatDate, formatTime, formatDateTime,
  calculateAge, calculateBMI, getBMICategory,
} from './utils/formatters';

export {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  TenantNotFoundError,
  PatientNotFoundError,
  AppointmentNotFoundError,
} from './errors/index';
export { UnauthorizedError } from './errors/index';

export type { RequestContext } from './middleware/index';
export { hasPermission, hasAnyPermission } from './middleware/index';

export { translations, t as translate, getDir } from './i18n/index';
export type { TranslationKey, Locale, Namespace } from './i18n/index';
