import { apiClient } from './client';

export const clinicalApi = {
  searchIcd10: (q: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiClient.get('/icd10', { params: { q, ...params } }).then(r => r.data),
  searchMedications: (q: string) =>
    apiClient.get('/medications/search', { params: { q } }).then(r => r.data.data),
  medicationCategories: () =>
    apiClient.get('/medications/categories').then(r => r.data.data),
  patientAllergies: (patientId: string) =>
    apiClient.get(`/patients/${patientId}/allergies`).then(r => r.data.data),
  addAllergy: (patientId: string, data: Record<string, unknown>) =>
    apiClient.post(`/patients/${patientId}/allergies`, data).then(r => r.data.data),
  deleteAllergy: (patientId: string, id: string) =>
    apiClient.delete(`/patients/${patientId}/allergies/${id}`).then(r => r.data.data),
  allergyCheck: (patientId: string, medication?: string) =>
    apiClient.get(`/patients/${patientId}/allergy-check`, { params: { medication } }).then(r => r.data.data),
  patientTimeline: (patientId: string) =>
    apiClient.get(`/patients/${patientId}/timeline`).then(r => r.data.data),
};
