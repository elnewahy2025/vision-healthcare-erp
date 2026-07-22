import { apiClient } from './client';

export const commonApi = {
  doctors: () =>
    apiClient.get('/doctors').then((r) => r.data.data),
  branches: () =>
    apiClient.get('/branches').then((r) => r.data.data),
  createBranch: (data: unknown) =>
    apiClient.post('/branches', data).then((r) => r.data.data),
  activity: () =>
    apiClient.get('/activity').then((r) => r.data.data),
};
