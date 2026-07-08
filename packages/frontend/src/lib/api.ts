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
