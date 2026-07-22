import { apiClient } from './client';

export const dashboardApi = {
  stats: () =>
    apiClient.get('/dashboard/stats').then((r) => r.data.data),
};
