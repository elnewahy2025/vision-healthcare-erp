import { apiClient } from './client';

export interface BiDashboard {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  layout: Record<string, unknown>[];
  isDefault: boolean;
  refreshInterval: string;
  createdAt: string;
  updatedAt: string;
}

export interface BiWidget {
  id: string;
  title: string;
  widgetType: string;
  dataSource: string;
  config: Record<string, unknown>;
  query: Record<string, unknown>;
  width: number;
  height: number;
  positionX: number;
  positionY: number;
}

export interface BiKpiAppointments {
  total: number;
  today: number;
  byStatus: { status: string; count: number }[];
}

export interface BiKpiRevenue {
  total: number;
  recent: number;
  byMethod: { paymentMethod: string; total: number }[];
}

export interface BiKpiPatients {
  total: number;
  newThisMonth: number;
}

export interface BiKpiClinical {
  labOrders: number;
  radiologyOrders: number;
  prescriptions: number;
}

export interface CreateBiDashboardPayload {
  name: string;
  slug?: string;
  category?: string;
  description?: string;
  layout?: Record<string, unknown>[];
  refreshInterval?: string;
}

export interface CreateBiWidgetPayload {
  title: string;
  widgetType?: string;
  dataSource?: string;
  config?: Record<string, unknown>;
  query?: Record<string, unknown>;
  width?: number;
  height?: number;
  positionX?: number;
  positionY?: number;
}

export const biApi = {
  listDashboards: (params?: { category?: string }) =>
    apiClient.get('/bi/dashboards', { params }).then((r) => r.data.data as BiDashboard[]),
  createDashboard: (data: CreateBiDashboardPayload) =>
    apiClient.post('/bi/dashboards', data).then((r) => r.data.data as BiDashboard),
  updateDashboard: (id: string, data: Partial<CreateBiDashboardPayload>) =>
    apiClient.put(`/bi/dashboards/${id}`, data).then((r) => r.data.data),
  deleteDashboard: (id: string) =>
    apiClient.delete(`/bi/dashboards/${id}`).then((r) => r.data.data),
  listWidgets: (dashboardId: string) =>
    apiClient.get(`/bi/dashboards/${dashboardId}/widgets`).then((r) => r.data.data as BiWidget[]),
  createWidget: (dashboardId: string, data: CreateBiWidgetPayload) =>
    apiClient.post(`/bi/dashboards/${dashboardId}/widgets`, data).then((r) => r.data.data as BiWidget),
  updateWidget: (id: string, data: Partial<CreateBiWidgetPayload>) =>
    apiClient.put(`/bi/widgets/${id}`, data).then((r) => r.data.data),
  deleteWidget: (id: string) =>
    apiClient.delete(`/bi/widgets/${id}`).then((r) => r.data.data),
  kpiAppointments: () =>
    apiClient.get('/bi/kpi/appointments').then((r) => r.data.data as BiKpiAppointments),
  kpiRevenue: (days?: number) =>
    apiClient.get('/bi/kpi/revenue', { params: { days } }).then((r) => r.data.data as BiKpiRevenue),
  kpiPatients: () =>
    apiClient.get('/bi/kpi/patients').then((r) => r.data.data as BiKpiPatients),
  kpiClinical: (days?: number) =>
    apiClient.get('/bi/kpi/clinical', { params: { days } }).then((r) => r.data.data as BiKpiClinical),
};
