import { apiClient } from './client';

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  patientId?: string;
  patientName?: string;
  status: string;
  version: number;
  description?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentCategory {
  key: string;
  label: string;
}

export interface UploadMetadata {
  title: string;
  category: string;
  patientId?: string;
  description?: string;
}

export const dmsApi = {
  list: (params?: { search?: string; category?: string; patientId?: string; page?: number; limit?: number }) =>
    apiClient.get('/dms/documents', { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get(`/dms/documents/${id}`).then((r) => r.data.data),
  upload: (file: File, metadata: UploadMetadata) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', metadata.title);
    formData.append('category', metadata.category);
    if (metadata.patientId) formData.append('patientId', metadata.patientId);
    if (metadata.description) formData.append('description', metadata.description);
    return apiClient.post('/dms/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data.data);
  },
  update: (id: string, data: { title?: string; category?: string; description?: string; status?: string }) =>
    apiClient.put(`/dms/documents/${id}`, data).then((r) => r.data.data),
  delete: (id: string) =>
    apiClient.delete(`/dms/documents/${id}`).then((r) => r.data.data),
  categories: () =>
    apiClient.get('/dms/categories').then((r) => r.data.data),
  downloadUrl: (id: string) => `/api/v1/dms/files/${id}/download`,
  attachmentUrl: (id: string) => `/api/v1/dms/files/${id}/attachment`,
  patientDocuments: (patientId: string) =>
    apiClient.get(`/patients/${patientId}/documents`).then((r) => r.data.data),
};
