import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantSlug = localStorage.getItem('tenantSlug');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantSlug) {
    config.headers['X-Tenant-Slug'] = tenantSlug;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      toast.error('Request timed out. Please check your connection and try again.');
      return Promise.reject(error);
    }
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait and try again.');
      return Promise.reject(error);
    }
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    const message = (error.response?.data as any)?.error || error.message;
    if (error.response?.status !== 401) {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);



// Security & Authentication (Phase 11)
export const securityApi = {
  forgotPassword: (email: string, tenantSlug: string) =>
    api.post('/auth/forgot-password', { email, tenantSlug }).then(r => r.data.data),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }).then(r => r.data.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then(r => r.data.data),
  mfaSetup: () =>
    api.post('/auth/mfa/setup').then(r => r.data.data),
  mfaEnable: (code: string) =>
    api.post('/auth/mfa/enable', { code }).then(r => r.data.data),
  mfaDisable: (code: string) =>
    api.post('/auth/mfa/disable', { code }).then(r => r.data.data),
  mfaVerify: (partialToken: string, code: string) =>
    api.post('/auth/mfa/verify', { partialToken, code }).then(r => r.data.data),
  sendOtp: (identifier: string, tenantSlug: string) =>
    api.post('/auth/otp/send', { identifier, tenantSlug }).then(r => r.data.data),
  verifyOtp: (identifier: string, code: string, purpose?: string) =>
    api.post('/auth/otp/verify', { identifier, code, purpose }).then(r => r.data.data),
};

// Audit Logs
export const auditApi = {
  list: (params?: any) => api.get('/audit-logs', { params }).then(r => r.data),
  get: (id: string) => api.get(`/audit-logs/${id}`).then(r => r.data.data),
  actionTypes: () => api.get('/audit-logs/actions/types').then(r => r.data.data),
};

// Communications (Phase 12)
export const communicationsApi = {
  templates: () => api.get('/notification-templates').then(r => r.data.data),
  updateTemplate: (id: string, data: any) =>
    api.put(`/notification-templates/${id}`, data).then(r => r.data.data),
  createTemplate: (data: any) =>
    api.post('/notification-templates', data).then(r => r.data.data),
  testTemplate: (id: string, recipient: string) =>
    api.post(`/notification-templates/${id}/test`, { recipient }).then(r => r.data.data),
  logs: (params?: any) => api.get('/notification-logs', { params }).then(r => r.data),
};



// DMS (Document Management)
export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  patientId?: string;
  patientName?: string;
  status: string;
  version: number;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentCategory {
  key: string;
  label: string;
}

export interface UploadMetadata {
  title: string;
  category: string;
  patientId?: string;
  description?: string;
}

export const dmsApi = {
  list: (params?: { search?: string; category?: string; patientId?: string; page?: number; limit?: number }) =>
    api.get('/dms/documents', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/dms/documents/${id}`).then((r) => r.data.data),
  upload: (file: File, metadata: UploadMetadata) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    formData.append('category', metadata.category);
    if (metadata.patientId) formData.append('patientId', metadata.patientId);
    if (metadata.description) formData.append('description', metadata.description);
    return api.post('/dms/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
  },
  update: (id: string, data: { title?: string; category?: string; description?: string; status?: string }) =>
    api.put(`/dms/documents/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/dms/documents/${id}`).then((r) => r.data.data),
  categories: () => api.get('/dms/categories').then((r) => r.data.data),
  downloadUrl: (id: string) => `/api/v1/dms/files/${id}/download`,
  attachmentUrl: (id: string) => `/api/v1/dms/files/${id}/attachment`,
  patientDocuments: (patientId: string) => api.get(`/patients/${patientId}/documents`).then((r) => r.data.data),
};



// Financial Reports
export const financialApi = {
  revenue: (params?: any) => api.get('/billing/revenue', { params }).then(r => r.data.data),
  revenueByMonth: (year?: number) => api.get('/billing/revenue/monthly', { params: { year } }).then(r => r.data.data),
  aging: () => api.get('/billing/reports/aging').then(r => r.data.data),
  topPatients: () => api.get('/billing/reports/top-patients').then(r => r.data.data),
};

// Insurance Claims
export interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  contractType: string;
  discountRate: number;
  coveragePlans?: string[];
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  insuranceId: string;
  insuranceName: string;
  status: string;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  submissionDate?: string;
  responseDate?: string;
  denialReason?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateCompanyPayload {
  name: string;
  code: string;
  contractType?: string;
  discountRate?: number;
}

export interface CreateClaimPayload {
  patientId: string;
  insuranceId: string;
  invoiceId?: string;
  claimedAmount: number;
}

export interface UpdateClaimPayload {
  status?: string;
  approvedAmount?: number;
  paidAmount?: number;
  denialReason?: string;
  notes?: string;
}

export const insuranceApi = {
  listCompanies: () => api.get('/insurance/companies').then((r) => r.data.data),
  createCompany: (data: CreateCompanyPayload) => api.post('/insurance/companies', data).then((r) => r.data.data),
  listClaims: (params?: { status?: string; patientId?: string }) =>
    api.get('/insurance/claims', { params }).then((r) => r.data.data),
  createClaim: (data: CreateClaimPayload) => api.post('/insurance/claims', data).then((r) => r.data.data),
  updateClaim: (id: string, data: UpdateClaimPayload) => api.put(`/insurance/claims/${id}`, data).then((r) => r.data.data),
};

export const claimsApi = {
  companies: () => api.get('/insurance-companies').then(r => r.data.data),
  createCompany: (data: any) => api.post('/insurance-companies', data).then(r => r.data.data),
  list: (params?: any) => api.get('/insurance-claims', { params }).then(r => r.data),
  create: (data: any) => api.post('/insurance-claims', data).then(r => r.data.data),
  submit: (id: string) => api.post(`/insurance-claims/${id}/submit`).then(r => r.data.data),
  updateStatus: (id: string, data: any) => api.patch(`/insurance-claims/${id}/status`, data).then(r => r.data.data),
  summary: () => api.get('/insurance-claims/summary').then(r => r.data.data),
};

// Payment
export const paymentApi = {
  createStripeSession: (invoiceId: string, amount: number, currency: string) =>
    api.post('/payments/stripe/create', { invoiceId, amount, currency }).then(r => r.data.data),
  paymentLink: (invoiceId: string, tenantSlug: string) =>
    api.get(`/payments/link/${tenantSlug}/${invoiceId}`).then(r => r.data.data),
};


// Clinical Reference (Phase 15)
export const clinicalApi = {
  searchIcd10: (q: string, params?: any) => api.get('/icd10', { params: { q, ...params } }).then(r => r.data),
  searchMedications: (q: string) => api.get('/medications/search', { params: { q } }).then(r => r.data.data),
  medicationCategories: () => api.get('/medications/categories').then(r => r.data.data),
  patientAllergies: (patientId: string) => api.get(`/patients/${patientId}/allergies`).then(r => r.data.data),
  addAllergy: (patientId: string, data: any) => api.post(`/patients/${patientId}/allergies`, data).then(r => r.data.data),
  deleteAllergy: (patientId: string, id: string) => api.delete(`/patients/${patientId}/allergies/${id}`).then(r => r.data.data),
  allergyCheck: (patientId: string, medication?: string) => api.get(`/patients/${patientId}/allergy-check`, { params: { medication } }).then(r => r.data.data),
  patientTimeline: (patientId: string) => api.get(`/patients/${patientId}/timeline`).then(r => r.data.data),
};


// Egypt Payment Gateways
export const egyptPaymentApi = {
  fawry: (invoiceId: string, amount: number, customerPhone: string, customerName: string, customerEmail?: string) =>
    api.post('/payments/fawry/create', { invoiceId, amount, customerPhone, customerName, customerEmail }).then(r => r.data.data),
  instapay: (amount: number) =>
    api.post('/payments/instapay', { amount }).then(r => r.data.data),
  etaQr: (invoiceId: string) =>
    api.get(`/invoices/${invoiceId}/eta-qr`).then(r => r.data.data),
};
export default api;

// Auth
export const authApi = {
  login: (data: { email: string; password: string; tenantSlug: string }) =>
    api.post('/auth/login', data).then((r) => r.data.data),
  register: (data: { name: string; slug: string; adminEmail: string; adminPassword: string; adminName: string; locale?: string }) =>
    api.post('/tenants', data).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data.data),
};

// Patients
export const patientsApi = {
  list: (params?: any) => api.get('/patients', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/patients/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/patients', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/patients/${id}`, data).then((r) => r.data.data),
  delete: (id: string) => api.delete(`/patients/${id}`).then((r) => r.data.data),
  search: (q: string) => api.get('/patients/search/quick', { params: { q } }).then((r) => r.data.data),
};

// Appointments
export const appointmentsApi = {
  list: (params?: any) => api.get('/appointments', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/appointments/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/appointments', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/appointments/${id}`, data).then((r) => r.data.data),
  checkIn: (id: string) => api.post(`/appointments/${id}/check-in`).then((r) => r.data.data),
  complete: (id: string) => api.post(`/appointments/${id}/complete`).then((r) => r.data.data),
  cancel: (id: string, reason?: string) => api.post(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.data),
  today: () => api.get('/appointments/today/summary').then((r) => r.data.data),
  getSlots: (doctorId: string, date: string) =>
    api.get(`/doctors/${doctorId}/slots`, { params: { date } }).then((r) => r.data.data),
};

// EMR
export const emrApi = {
  list: (params?: any) => api.get('/emr', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/emr/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/emr', data).then((r) => r.data.data),
  update: (id: string, data: any) => api.put(`/emr/${id}`, data).then((r) => r.data.data),
  sign: (id: string) => api.post(`/emr/${id}/sign`).then((r) => r.data.data),
  addDiagnosis: (emrId: string, data: any) => api.post(`/emr/${emrId}/diagnosis`, data).then((r) => r.data.data),
  prescribeMedication: (emrId: string, data: any) => api.post(`/emr/${emrId}/medications`, data).then((r) => r.data.data),
  patientHistory: (patientId: string, params?: any) =>
    api.get(`/patients/${patientId}/emr`, { params }).then((r) => r.data),
};

// Billing
export interface BillingListParams {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CreateInvoicePayload {
  patientId: string;
  appointmentId?: string;
  items: { description: string; code: string; quantity: number; unitPrice: number; type: string; total: number }[];
  discount: number;
  tax: number;
  dueDate: string;
  notes?: string;
  insuranceClaim?: string;
}

export interface PayInvoicePayload {
  amount: number;
  method: string;
  notes?: string;
}

export interface RevenueSummary {
  total_revenue: number;
  total_collected: number;
  total_pending: number;
  invoice_count: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
  period: { start: string; end: string };
}

export const billingApi = {
  list: (params?: BillingListParams) => api.get('/invoices', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/invoices/${id}`).then((r) => r.data.data),
  create: (data: CreateInvoicePayload) => api.post('/invoices', data).then((r) => r.data.data),
  pay: (id: string, data: PayInvoicePayload) =>
    api.post(`/invoices/${id}/pay`, data).then((r) => r.data.data),
  revenue: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/billing/revenue', { params }).then((r) => r.data.data),
  patientInvoices: (patientId: string, params?: BillingListParams) =>
    api.get(`/patients/${patientId}/invoices`, { params }).then((r) => r.data),
};

export interface CompliancePolicy {
  id: string;
  title: string;
  code: string;
  category: string;
  description?: string;
  content?: string;
  status: string;
  effectiveDate?: string;
  reviewDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAudit {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  scope?: string;
  findings?: string;
  recommendations?: string;
  auditor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentLog {
  id: string;
  patientId: string;
  patientName: string;
  consentType: string;
  granted: boolean;
  details?: string;
  ipAddress?: string;
  consentedAt: string;
}

export interface BreachLog {
  id: string;
  type: string;
  detectedDate: string;
  reportedDate?: string;
  severity: string;
  description?: string;
  affectedData?: string;
  affectedRecords: number;
  actionTaken?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const complianceApi = {
  listPolicies: (params?: { category?: string; status?: string }) =>
    api.get('/compliance/policies', { params }).then((r) => r.data.data),
  createPolicy: (data: Partial<CompliancePolicy>) =>
    api.post('/compliance/policies', data).then((r) => r.data.data),
  listAudits: (params?: { status?: string; type?: string }) =>
    api.get('/compliance/audits', { params }).then((r) => r.data.data),
  createAudit: (data: Partial<ComplianceAudit>) =>
    api.post('/compliance/audits', data).then((r) => r.data.data),
  listConsents: (params?: { patientId?: string }) =>
    api.get('/compliance/consents', { params }).then((r) => r.data.data),
  listBreaches: (params?: { status?: string; severity?: string }) =>
    api.get('/compliance/breaches', { params }).then((r) => r.data.data),
  createBreach: (data: Partial<BreachLog>) =>
    api.post('/compliance/breaches', data).then((r) => r.data.data),
};

export interface FormDefinition {
  id: string;
  name: string;
  slug: string;
  category: string;
  schema: unknown;
  uiSchema: unknown;
  isActive: boolean;
  description?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formName: string;
  patientId?: string;
  patientName?: string;
  data: unknown;
  status: string;
  submittedBy: string;
  submittedAt: string;
  createdAt: string;
}

export interface CreateFormDefinitionPayload {
  name: string;
  slug?: string;
  category?: string;
  schema?: unknown;
  uiSchema?: unknown;
  description?: string;
  isActive?: boolean;
}

export interface SubmitFormPayload {
  formId: string;
  patientId?: string;
  appointmentId?: string;
  data: unknown;
  status?: string;
}

export const formsApi = {
  listDefinitions: (params?: { category?: string; isActive?: string }) =>
    api.get('/forms/definitions', { params }).then((r) => r.data.data),
  createDefinition: (data: CreateFormDefinitionPayload) =>
    api.post('/forms/definitions', data).then((r) => r.data.data),
  updateDefinition: (id: string, data: Partial<CreateFormDefinitionPayload>) =>
    api.put(`/forms/definitions/${id}`, data).then((r) => r.data.data),
  getDefinition: (id: string) => api.get(`/forms/definitions/${id}`).then((r) => r.data.data),
  listSubmissions: (params?: { formId?: string; patientId?: string }) =>
    api.get('/forms/submissions', { params }).then((r) => r.data.data),
  submitForm: (data: SubmitFormPayload) =>
    api.post('/forms/submissions', data).then((r) => r.data.data),
};

export interface WorkflowDefinition {
  id: string;
  name: string;
  slug: string;
  category: string;
  steps: unknown[];
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  definitionName: string;
  referenceType?: string;
  referenceId?: string;
  status: string;
  currentStep: number;
  context?: unknown;
  data?: unknown;
  assignedTo?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowDefinitionPayload {
  name: string;
  slug?: string;
  category?: string;
  steps?: unknown[];
  description?: string;
  isActive?: boolean;
}

export interface StartWorkflowInstancePayload {
  definitionId: string;
  referenceType?: string;
  referenceId?: string;
  currentStep?: number;
  context?: unknown;
  data?: unknown;
  assignedTo?: string;
}

export const workflowApi = {
  listDefinitions: (params?: { isActive?: string }) =>
    api.get('/workflow/definitions', { params }).then((r) => r.data.data),
  createDefinition: (data: CreateWorkflowDefinitionPayload) =>
    api.post('/workflow/definitions', data).then((r) => r.data.data),
  updateDefinition: (id: string, data: Partial<CreateWorkflowDefinitionPayload>) =>
    api.put(`/workflow/definitions/${id}`, data).then((r) => r.data.data),
  listInstances: (params?: { status?: string; definitionId?: string }) =>
    api.get('/workflow/instances', { params }).then((r) => r.data.data),
  startInstance: (data: StartWorkflowInstancePayload) =>
    api.post('/workflow/instances', data).then((r) => r.data.data),
  advanceStep: (id: string, data: { currentStep?: number; status?: string; data?: unknown; assignedTo?: string }) =>
    api.put(`/workflow/instances/${id}/step`, data).then((r) => r.data.data),
};

export interface CrmCampaign {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  targetCount: number;
  reachedCount: number;
  conversionCount: number;
}

export interface PatientFeedback {
  id: string;
  patientId: string;
  patientName: string;
  rating: number;
  comment?: string;
  category: string;
  createdAt: string;
}

export interface CreateCampaignPayload {
  name: string;
  type?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  targetCount?: number;
}

export const crmApi = {
  listCampaigns: (params?: { status?: string }) =>
    api.get('/crm/campaigns', { params }).then((r) => r.data.data),
  createCampaign: (data: CreateCampaignPayload) =>
    api.post('/crm/campaigns', data).then((r) => r.data.data),
  listFeedback: () => api.get('/crm/feedback').then((r) => r.data.data),
};

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  status: string;
  baseSalary: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string;
  managerNotes?: string;
  createdAt: string;
}

export interface PayrollEntry {
  id: string;
  employeeId: string;
  grossPay: number;
  deductions: number;
  netPay: number;
  bonuses: number;
  overtime: number;
  tax: number;
}

export interface PayrollRun {
  id: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  processedAt: string;
  entries: PayrollEntry[];
}

export interface CreateEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType?: string;
  hireDate?: string;
  baseSalary?: number;
  payFrequency?: string;
}

export interface CreateLeavePayload {
  employeeId: string;
  leaveType?: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export const hrApi = {
  listEmployees: (params?: { department?: string; status?: string }) =>
    api.get('/hr/employees', { params }).then((r) => r.data.data),
  createEmployee: (data: CreateEmployeePayload) =>
    api.post('/hr/employees', data).then((r) => r.data.data),
  listAttendance: (params?: { date?: string; employeeId?: string }) =>
    api.get('/hr/attendance', { params }).then((r) => r.data.data),
  listLeaveRequests: (params?: { status?: string; employeeId?: string }) =>
    api.get('/hr/leave-requests', { params }).then((r) => r.data.data),
  createLeaveRequest: (data: CreateLeavePayload) =>
    api.post('/hr/leave-requests', data).then((r) => r.data.data),
  approveLeave: (id: string, data: { status: string; managerNotes?: string }) =>
    api.put(`/hr/leave-requests/${id}/approve`, data).then((r) => r.data.data),
  listPayroll: () => api.get('/hr/payroll').then((r) => r.data.data),
};

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  unitPrice: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  warehouseId: string;
  warehouseName?: string;
  status: string;
  lastRestockedAt?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: string;
}

export interface PurchaseOrderItem {
  id: string;
  itemName: string;
  sku?: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt: string;
}

export interface CreateItemPayload {
  warehouseId: string;
  sku: string;
  name: string;
  category: string;
  unit?: string;
  quantity?: number;
  reorderPoint?: number;
  unitCost?: number;
  unitPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumber?: string;
  manufacturer?: string;
  supplier?: string;
  description?: string;
}

export interface CreateWarehousePayload {
  name: string;
  code: string;
  type?: string;
}

export interface CreatePoPayload {
  warehouseId?: string;
  supplier: string;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  items?: { itemName: string; sku?: string; quantityOrdered: number; unitCost?: number }[];
}

export const inventoryApi = {
  listItems: (params?: { category?: string; warehouseId?: string; search?: string }) =>
    api.get('/inventory/items', { params }).then((r) => r.data.data),
  createItem: (data: CreateItemPayload) =>
    api.post('/inventory/items', data).then((r) => r.data.data),
  updateStock: (id: string, data: { quantity: number; type?: string; notes?: string }) =>
    api.put(`/inventory/items/${id}/stock`, data).then((r) => r.data.data),
  listWarehouses: () => api.get('/inventory/warehouses').then((r) => r.data.data),
  createWarehouse: (data: CreateWarehousePayload) =>
    api.post('/inventory/warehouses', data).then((r) => r.data.data),
  listPos: (params?: { status?: string }) =>
    api.get('/inventory/pos', { params }).then((r) => r.data.data),
  createPo: (data: CreatePoPayload) =>
    api.post('/inventory/pos', data).then((r) => r.data.data),
  receivePo: (id: string, items: { id: string; quantityReceived: number }[]) =>
    api.put(`/inventory/pos/${id}/receive`, { items }).then((r) => r.data.data),
};

// AI Hub
export interface AiAssistant {
  id: string;
  name: string;
  slug: string;
  category: string;
  systemPrompt?: string;
  tools: string[];
  modelId?: string;
  modelName?: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface AiProvider {
  id: string;
  name: string;
  provider: string;
  apiEndpoint?: string;
  config: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

export interface AiModel {
  id: string;
  providerId: string;
  modelName: string;
  displayName?: string;
  capabilities: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  isActive: boolean;
}

export interface AiRequest {
  id: string;
  assistantId?: string;
  modelId?: string;
  prompt?: string;
  response?: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs: number;
  status: string;
  error?: string;
  source: string;
  createdAt: string;
}

export interface AiCostDaily {
  date: string;
  source: string;
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
}

export interface AiCostData {
  daily: AiCostDaily[];
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
  };
}

export interface CreateAiAssistantPayload {
  name: string;
  slug?: string;
  category?: string;
  systemPrompt?: string;
  tools?: string[];
  modelId?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateAiProviderPayload {
  name: string;
  provider: string;
  apiEndpoint?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export const aiHubApi = {
  listAssistants: (params?: { category?: string }) =>
    api.get('/ai/assistants', { params }).then((r) => r.data.data as AiAssistant[]),
  createAssistant: (data: CreateAiAssistantPayload) =>
    api.post('/ai/assistants', data).then((r) => r.data.data as AiAssistant),
  updateAssistant: (id: string, data: Partial<CreateAiAssistantPayload>) =>
    api.put(`/ai/assistants/${id}`, data).then((r) => r.data.data),
  listProviders: () =>
    api.get('/ai/providers').then((r) => r.data.data as AiProvider[]),
  createProvider: (data: CreateAiProviderPayload) =>
    api.post('/ai/providers', data).then((r) => r.data.data as AiProvider),
  updateProvider: (id: string, data: Partial<CreateAiProviderPayload>) =>
    api.put(`/ai/providers/${id}`, data).then((r) => r.data.data),
  listModels: () =>
    api.get('/ai/models').then((r) => r.data.data as AiModel[]),
  createModel: (data: { providerId: string; modelName: string; displayName?: string; capabilities?: string; costPer1kInput?: number; costPer1kOutput?: number; maxTokens?: number }) =>
    api.post('/ai/models', data).then((r) => r.data.data as AiModel),
  listRequests: (params?: { status?: string; source?: string; limit?: number }) =>
    api.get('/ai/requests', { params }).then((r) => r.data.data as AiRequest[]),
  getCosts: (params?: { days?: number }) =>
    api.get('/ai/costs', { params }).then((r) => r.data.data as AiCostData),
  chat: (data: { assistantId?: string; modelId?: string; prompt: string; source?: string }) =>
    api.post('/ai/chat', data).then((r) => r.data.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data.data),
};

// Reports
export interface ReportColumn {
  header: string;
  accessor: string;
  type?: string;
  width?: number;
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  cron: string;
  recipients: string[];
  format: string;
  params: Record<string, unknown>;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  status: string;
  format: string;
  error?: string;
  rowCount: number;
  trigger: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  queryConfig: Record<string, unknown>;
  columns: ReportColumn[];
  filters: Record<string, unknown>[];
  sorting: Record<string, unknown>[];
  exportFormats: string[];
  isScheduled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportPayload {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  queryConfig?: Record<string, unknown>;
  columns?: ReportColumn[];
  filters?: Record<string, unknown>[];
  sorting?: Record<string, unknown>[];
  exportFormats?: string[];
}

export interface CreateSchedulePayload {
  cron?: string;
  recipients?: string[];
  format?: string;
  params?: Record<string, unknown>;
  isActive?: boolean;
}

export const reportsApi = {
  list: (params?: { category?: string }) =>
    api.get('/reports', { params }).then((r) => r.data.data as ReportDefinition[]),
  create: (data: CreateReportPayload) =>
    api.post('/reports', data).then((r) => r.data.data as ReportDefinition),
  update: (id: string, data: Partial<CreateReportPayload>) =>
    api.put(`/reports/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    api.delete(`/reports/${id}`).then((r) => r.data.data),
  listSchedules: (reportId: string) =>
    api.get(`/reports/${reportId}/schedules`).then((r) => r.data.data as ReportSchedule[]),
  createSchedule: (reportId: string, data: CreateSchedulePayload) =>
    api.post(`/reports/${reportId}/schedules`, data).then((r) => r.data.data as ReportSchedule),
  updateSchedule: (id: string, data: Partial<CreateSchedulePayload>) =>
    api.put(`/reports/schedules/${id}`, data).then((r) => r.data.data),
  listExecutions: (reportId: string) =>
    api.get(`/reports/${reportId}/executions`).then((r) => r.data.data as ReportExecution[]),
  execute: (reportId: string, data?: { format?: string }) =>
    api.post(`/reports/${reportId}/execute`, data).then((r) => r.data.data as ReportExecution),
  export: (executionId: string, format: string) =>
    api.get(`/reports/export/${executionId}/${format}`).then((r) => r.data.data),
};

// BI Dashboards
export interface BiDashboard {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  layout: Record<string, unknown>[];
  isDefault: boolean;
  refreshInterval: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiWidget {
  id: string;
  title: string;
  widgetType: string;
  dataSource: string;
  config: Record<string, unknown>;
  query: Record<string, unknown>;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
}

export interface BiKpiAppointments {
  total: number;
  today: number;
  byStatus: { status: string; count: number }[];
}

export interface BiKpiRevenue {
  total: number;
  recent: number;
  byMethod: { paymentMethod: string; total: number }[];
}

export interface BiKpiPatients {
  total: number;
  newThisMonth: number;
}

export interface BiKpiClinical {
  labOrders: number;
  radiologyOrders: number;
  prescriptions: number;
}

export interface CreateBiDashboardPayload {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  layout?: Record<string, unknown>[];
  refreshInterval?: string;
}

export interface CreateBiWidgetPayload {
  title: string;
  widgetType?: string;
  dataSource?: string;
  config?: Record<string, unknown>;
  query?: Record<string, unknown>;
  width?: number;
  height?: number;
  positionX?: number;
  positionY?: number;
}

export const biApi = {
  listDashboards: (params?: { category?: string }) =>
    api.get('/bi/dashboards', { params }).then((r) => r.data.data as BiDashboard[]),
  createDashboard: (data: CreateBiDashboardPayload) =>
    api.post('/bi/dashboards', data).then((r) => r.data.data as BiDashboard),
  updateDashboard: (id: string, data: Partial<CreateBiDashboardPayload>) =>
    api.put(`/bi/dashboards/${id}`, data).then((r) => r.data.data),
  deleteDashboard: (id: string) =>
    api.delete(`/bi/dashboards/${id}`).then((r) => r.data.data),
  listWidgets: (dashboardId: string) =>
    api.get(`/bi/dashboards/${dashboardId}/widgets`).then((r) => r.data.data as BiWidget[]),
  createWidget: (dashboardId: string, data: CreateBiWidgetPayload) =>
    api.post(`/bi/dashboards/${dashboardId}/widgets`, data).then((r) => r.data.data as BiWidget),
  updateWidget: (id: string, data: Partial<CreateBiWidgetPayload>) =>
    api.put(`/bi/widgets/${id}`, data).then((r) => r.data.data),
  deleteWidget: (id: string) =>
    api.delete(`/bi/widgets/${id}`).then((r) => r.data.data),
  kpiAppointments: () =>
    api.get('/bi/kpi/appointments').then((r) => r.data.data as BiKpiAppointments),
  kpiRevenue: (days?: number) =>
    api.get('/bi/kpi/revenue', { params: { days } }).then((r) => r.data.data as BiKpiRevenue),
  kpiPatients: () =>
    api.get('/bi/kpi/patients').then((r) => r.data.data as BiKpiPatients),
  kpiClinical: (days?: number) =>
    api.get('/bi/kpi/clinical', { params: { days } }).then((r) => r.data.data as BiKpiClinical),
};

// Common
export const commonApi = {
  doctors: () => api.get('/doctors').then((r) => r.data.data),
  branches: () => api.get('/branches').then((r) => r.data.data),
  createBranch: (data: any) => api.post('/branches', data).then((r) => r.data.data),
  activity: () => api.get('/activity').then((r) => r.data.data),
};
