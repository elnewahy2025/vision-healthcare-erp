import { apiClient } from './client';
import type { InsuranceCompany, CreateCompanyPayload } from './insurance';

export interface InsuranceClaimsListParams {
  page?: number;
  limit?: number;
  status?: string;
  insuranceId?: string;
  patientId?: string;
}

export interface InsuranceClaimListItem {
  id: string;
  claimNumber: string;
  status: string;
  patientName: string | null;
  patientMrn: string | null;
  companyName: string | null;
  invoiceNumber: string | null;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  submissionDate: string | null;
  responseDate: string | null;
  denialReason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InsuranceClaimsSummary {
  total: number;
  totalClaimed: number;
  totalApproved: number;
  totalPaid: number;
  draft: number;
  submitted: number;
  approved: number;
  denied: number;
  paid: number;
}

export interface CreateInsuranceClaimPayload {
  patientId: string;
  invoiceId: string;
  insuranceId: string;
  claimedAmount: number;
  notes?: string;
}

export interface UpdateClaimStatusPayload {
  status: 'acknowledged' | 'in_review' | 'approved' | 'denied' | 'paid';
  approvedAmount?: number;
  paidAmount?: number;
  denialReason?: string;
}

export const claimsApi = {
  companies: () =>
    apiClient.get('/insurance-companies').then((r) => r.data.data as InsuranceCompany[]),
  createCompany: (data: CreateCompanyPayload) =>
    apiClient.post('/insurance-companies', data).then((r) => r.data.data),
  list: (params?: InsuranceClaimsListParams) =>
    apiClient.get('/insurance-claims', { params }).then((r) => r.data as { data: InsuranceClaimListItem[]; pagination: { total: number; totalPages: number; page: number; limit: number } }),
  create: (data: CreateInsuranceClaimPayload) =>
    apiClient.post('/insurance-claims', data).then((r) => r.data.data),
  submit: (id: string) =>
    apiClient.post(`/insurance-claims/${id}/submit`).then((r) => r.data.data),
  updateStatus: (id: string, data: UpdateClaimStatusPayload) =>
    apiClient.patch(`/insurance-claims/${id}/status`, data).then((r) => r.data.data),
  summary: () =>
    apiClient.get('/insurance-claims/summary').then((r) => r.data.data as InsuranceClaimsSummary),
};
