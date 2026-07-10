import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: '/api/v1',
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
export const dmsApi = {
  list: (params?: any) => api.get('/dms/documents', { params }).then(r => r.data),
  get: (id: string) => api.get(`/dms/documents/${id}`).then(r => r.data.data),
  upload: (file: File, metadata: { title: string; category: string; patientId?: string; description?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    formData.append('category', metadata.category);
    if (metadata.patientId) formData.append('patientId', metadata.patientId);
    if (metadata.description) formData.append('description', metadata.description);
    return api.post('/dms/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
  },
  update: (id: string, data: any) => api.put(`/dms/documents/${id}`, data).then(r => r.data.data),
  delete: (id: string) => api.delete(`/dms/documents/${id}`).then(r => r.data.data),
  categories: () => api.get('/dms/categories').then(r => r.data.data),
  downloadUrl: (id: string) => `/api/v1/dms/files/${id}/download`,
  attachmentUrl: (id: string) => `/api/v1/dms/files/${id}/attachment`,
  patientDocuments: (patientId: string) => api.get(`/patients/${patientId}/documents`).then(r => r.data.data),
};



// Financial Reports
export const financialApi = {
  revenue: (params?: any) => api.get('/billing/revenue', { params }).then(r => r.data.data),
  revenueByMonth: (year?: number) => api.get('/billing/revenue/monthly', { params: { year } }).then(r => r.data.data),
  aging: () => api.get('/billing/reports/aging').then(r => r.data.data),
  topPatients: () => api.get('/billing/reports/top-patients').then(r => r.data.data),
};

// Insurance Claims
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
export const billingApi = {
  list: (params?: any) => api.get('/invoices', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/invoices/${id}`).then((r) => r.data.data),
  create: (data: any) => api.post('/invoices', data).then((r) => r.data.data),
  pay: (id: string, data: { amount: number; method: string; notes?: string }) =>
    api.post(`/invoices/${id}/pay`, data).then((r) => r.data.data),
  revenue: (params?: any) => api.get('/billing/revenue', { params }).then((r) => r.data.data),
  patientInvoices: (patientId: string, params?: any) =>
    api.get(`/patients/${patientId}/invoices`, { params }).then((r) => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data.data),
};

// Common
export const commonApi = {
  doctors: () => api.get('/doctors').then((r) => r.data.data),
  branches: () => api.get('/branches').then((r) => r.data.data),
  createBranch: (data: any) => api.post('/branches', data).then((r) => r.data.data),
  activity: () => api.get('/activity').then((r) => r.data.data),
};
