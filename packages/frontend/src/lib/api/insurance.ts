import { apiClient } from './client';

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
  listCompanies: () =>
    apiClient.get('/insurance/companies').then((r) => r.data.data),
  createCompany: (data: CreateCompanyPayload) =>
    apiClient.post('/insurance/companies', data).then((r) => r.data.data),
  listClaims: (params?: { status?: string; patientId?: string }) =>
    apiClient.get('/insurance/claims', { params }).then((r) => r.data.data),
  createClaim: (data: CreateClaimPayload) =>
    apiClient.post('/insurance/claims', data).then((r) => r.data.data),
  updateClaim: (id: string, data: UpdateClaimPayload) =>
    apiClient.put(`/insurance/claims/${id}`, data).then((r) => r.data.data),
};
