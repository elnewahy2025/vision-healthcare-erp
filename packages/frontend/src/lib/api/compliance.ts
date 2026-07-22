import { apiClient } from './client';

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

export interface ComplianceReport {
  id: string;
  title: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  findings?: string;
  recommendations?: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  createdAt: string;
}

export interface HipaaAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  changes: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: string;
}

export interface HipaaSummary {
  totalEvents: number;
  uniqueUsers: number;
  byAction: { action: string; count: number }[];
  byEntity: { entity: string; count: number }[];
}

export interface RetentionPolicy {
  id: string;
  entity: string;
  retentionDays: number;
  action: string;
  isActive: boolean;
  lastCleanupAt: string | null;
}

export interface Baa {
  id: string;
  organizationName: string;
  contactName: string | null;
  contactEmail: string | null;
  scope: string | null;
  executedDate: string | null;
  expiryDate: string | null;
  status: string;
  terms: string | null;
}

export interface CreateComplianceReportPayload {
  title: string;
  type?: string;
  periodStart: string;
  periodEnd: string;
  data?: Record<string, unknown>;
  format?: string;
}

export interface CreateBaaPayload {
  organizationName: string;
  contactName?: string;
  contactEmail?: string;
  scope?: string;
  executedDate?: string;
  expiryDate?: string;
  status?: string;
  terms?: string;
}

export const complianceApi = {
  listPolicies: (params?: { category?: string; status?: string }) =>
    apiClient.get('/compliance/policies', { params }).then((r) => r.data.data),
  createPolicy: (data: Partial<CompliancePolicy>) =>
    apiClient.post('/compliance/policies', data).then((r) => r.data.data),
  listAudits: (params?: { status?: string; type?: string }) =>
    apiClient.get('/compliance/audits', { params }).then((r) => r.data.data),
  createAudit: (data: Partial<ComplianceAudit>) =>
    apiClient.post('/compliance/audits', data).then((r) => r.data.data),
  listConsents: (params?: { patientId?: string }) =>
    apiClient.get('/compliance/consents', { params }).then((r) => r.data.data),
  listBreaches: (params?: { status?: string; severity?: string }) =>
    apiClient.get('/compliance/breaches', { params }).then((r) => r.data.data),
  createBreach: (data: Partial<BreachLog>) =>
    apiClient.post('/compliance/breaches', data).then((r) => r.data.data),
  listReports: (params?: { type?: string; status?: string }) =>
    apiClient.get('/compliance/reports', { params }).then((r) => r.data.data as ComplianceReport[]),
  createReport: (data: CreateComplianceReportPayload) =>
    apiClient.post('/compliance/reports', data).then((r) => r.data.data),
  updateReport: (id: string, data: Partial<ComplianceReport>) =>
    apiClient.put(`/compliance/reports/${id}`, data).then((r) => r.data.data),
  hipaaAudit: (params?: { entity?: string; days?: number; userId?: string }) =>
    apiClient.get('/compliance/hipaa-audit', { params }).then((r) => r.data.data as HipaaAuditLog[]),
  hipaaSummary: (params?: { days?: number }) =>
    apiClient.get('/compliance/hipaa-summary', { params }).then((r) => r.data.data as HipaaSummary),
  listRetentionPolicies: () =>
    apiClient.get('/compliance/retention-policies').then((r) => r.data.data as RetentionPolicy[]),
  createRetentionPolicy: (data: { entity: string; retentionDays?: number; action?: string; isActive?: boolean }) =>
    apiClient.post('/compliance/retention-policies', data).then((r) => r.data.data),
  updateRetentionPolicy: (id: string, data: Partial<RetentionPolicy>) =>
    apiClient.put(`/compliance/retention-policies/${id}`, data).then((r) => r.data.data),
  listBaas: () =>
    apiClient.get('/compliance/baa').then((r) => r.data.data as Baa[]),
  createBaa: (data: CreateBaaPayload) =>
    apiClient.post('/compliance/baa', data).then((r) => r.data.data),
  updateBaa: (id: string, data: Partial<Baa>) =>
    apiClient.put(`/compliance/baa/${id}`, data).then((r) => r.data.data),
};
