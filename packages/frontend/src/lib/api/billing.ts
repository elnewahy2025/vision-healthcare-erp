import { apiClient } from './client';

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

export const billingApi = {
  list: (params?: BillingListParams) =>
    apiClient.get('/invoices', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/invoices/${id}`).then((r) => r.data.data),
  create: (data: CreateInvoicePayload) =>
    apiClient.post('/invoices', data).then((r) => r.data.data),
  pay: (id: string, data: PayInvoicePayload) =>
    apiClient.post(`/invoices/${id}/pay`, data).then((r) => r.data.data),
  revenue: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get('/billing/revenue', { params }).then((r) => r.data.data),
  patientInvoices: (patientId: string, params?: BillingListParams) =>
    apiClient.get(`/patients/${patientId}/invoices`, { params }).then((r) => r.data),
};
