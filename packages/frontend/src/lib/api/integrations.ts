import { apiClient } from './client';

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  provider: string;
  category: string;
  description?: string;
  configSchema: Record<string, unknown>;
  availableActions: string[];
  icon?: string;
}

export interface IntegrationConnection {
  id: string;
  name: string;
  definitionId: string;
  definitionName: string;
  provider: string;
  category: string;
  config: Record<string, unknown>;
  status: string;
  lastError?: string;
  lastSyncAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IntegrationWebhook {
  id: string;
  name: string;
  integrationId: string | null;
  integrationName: string | null;
  url: string;
  events: string[];
  status: string;
  retryCount: number;
  timeoutSeconds: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  attempt: number;
  error?: string;
  createdAt: string;
}

export interface CreateConnectionPayload {
  definitionId: string;
  name: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CreateWebhookPayload {
  integrationId?: string;
  name: string;
  url: string;
  events?: string[];
  headers?: Record<string, string>;
  retryCount?: number;
  timeoutSeconds?: number;
}

export const integrationsApi = {
  listCatalog: () =>
    apiClient.get('/integrations/catalog').then((r) => r.data.data as IntegrationCatalogItem[]),
  listConnections: () =>
    apiClient.get('/integrations/connections').then((r) => r.data.data as IntegrationConnection[]),
  createConnection: (data: CreateConnectionPayload) =>
    apiClient.post('/integrations/connections', data).then((r) => r.data.data),
  updateConnection: (id: string, data: Partial<CreateConnectionPayload>) =>
    apiClient.put(`/integrations/connections/${id}`, data).then((r) => r.data.data),
  testConnection: (id: string) =>
    apiClient.post(`/integrations/connections/${id}/test`).then((r) => r.data.data),
  deleteConnection: (id: string) =>
    apiClient.delete(`/integrations/connections/${id}`).then((r) => r.data.data),
  listWebhooks: () =>
    apiClient.get('/integrations/webhooks').then((r) => r.data.data as IntegrationWebhook[]),
  createWebhook: (data: CreateWebhookPayload) =>
    apiClient.post('/integrations/webhooks', data).then((r) => r.data.data),
  updateWebhook: (id: string, data: Partial<CreateWebhookPayload>) =>
    apiClient.put(`/integrations/webhooks/${id}`, data).then((r) => r.data.data),
  listWebhookLogs: (webhookId: string) =>
    apiClient.get(`/integrations/webhooks/${webhookId}/logs`).then((r) => r.data.data as WebhookLog[]),
};
