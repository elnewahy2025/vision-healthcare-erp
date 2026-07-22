import { apiClient } from './client';

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
    apiClient.get('/forms/definitions', { params }).then((r) => r.data.data),
  createDefinition: (data: CreateFormDefinitionPayload) =>
    apiClient.post('/forms/definitions', data).then((r) => r.data.data),
  updateDefinition: (id: string, data: Partial<CreateFormDefinitionPayload>) =>
    apiClient.put(`/forms/definitions/${id}`, data).then((r) => r.data.data),
  getDefinition: (id: string) =>
    apiClient.get(`/forms/definitions/${id}`).then((r) => r.data.data),
  listSubmissions: (params?: { formId?: string; patientId?: string }) =>
    apiClient.get('/forms/submissions', { params }).then((r) => r.data.data),
  submitForm: (data: SubmitFormPayload) =>
    apiClient.post('/forms/submissions', data).then((r) => r.data.data),
};
