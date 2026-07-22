import { apiClient } from './client';

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
    apiClient.get('/crm/campaigns', { params }).then((r) => r.data.data),
  createCampaign: (data: CreateCampaignPayload) =>
    apiClient.post('/crm/campaigns', data).then((r) => r.data.data),
  listFeedback: () =>
    apiClient.get('/crm/feedback').then((r) => r.data.data),
};
