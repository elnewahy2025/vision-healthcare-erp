import { apiClient } from './client';

export const emrApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/emr', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/emr/${id}`).then((r) => r.data.data),
  create: (data: unknown) =>
    apiClient.post('/emr', data).then((r) => r.data.data),
  update: (id: string, data: unknown) =>
    apiClient.put(`/emr/${id}`, data).then((r) => r.data.data),
  sign: (id: string) =>
    apiClient.post(`/emr/${id}/sign`).then((r) => r.data.data),
  addDiagnosis: (emrId: string, data: unknown) =>
    apiClient.post(`/emr/${emrId}/diagnosis`, data).then((r) => r.data.data),
  prescribeMedication: (emrId: string, data: unknown) =>
    apiClient.post(`/emr/${emrId}/medications`, data).then((r) => r.data.data),
  patientHistory: (patientId: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get(`/patients/${patientId}/emr`, { params }).then((r) => r.data),
};
