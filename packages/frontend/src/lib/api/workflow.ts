import { apiClient } from './client';

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
    apiClient.get('/workflow/definitions', { params }).then((r) => r.data.data),
  createDefinition: (data: CreateWorkflowDefinitionPayload) =>
    apiClient.post('/workflow/definitions', data).then((r) => r.data.data),
  updateDefinition: (id: string, data: Partial<CreateWorkflowDefinitionPayload>) =>
    apiClient.put(`/workflow/definitions/${id}`, data).then((r) => r.data.data),
  listInstances: (params?: { status?: string; definitionId?: string }) =>
    apiClient.get('/workflow/instances', { params }).then((r) => r.data.data),
  startInstance: (data: StartWorkflowInstancePayload) =>
    apiClient.post('/workflow/instances', data).then((r) => r.data.data),
  advanceStep: (id: string, data: { currentStep?: number; status?: string; data?: unknown; assignedTo?: string }) =>
    apiClient.put(`/workflow/instances/${id}/step`, data).then((r) => r.data.data),
};
