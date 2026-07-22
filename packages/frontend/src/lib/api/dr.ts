import { apiClient } from './client';

export interface BackupConfig {
  id: string;
  name: string;
  type: string;
  schedule: string;
  retentionDays: number;
  storageLocation: string;
  includeSchemas: string[];
  excludeTables: string[];
  isActive: boolean;
  lastBackupAt: string | null;
}

export interface BackupExecution {
  id: string;
  configId: string | null;
  configName: string | null;
  status: string;
  type: string;
  sizeBytes: number | null;
  filePath: string | null;
  checksum: string | null;
  error: string | null;
  trigger: string;
  startedAt: string;
  completedAt: string | null;
}

export interface DrConfig {
  id?: string;
  replicationRegion: string;
  failoverStrategy: string;
  rpoMinutes: number;
  rtoMinutes: number;
  crossRegionReplication: boolean;
  secondaryRegion: string | null;
  status: string;
  lastDrTestAt: string | null;
}

export interface CreateBackupConfigPayload {
  name: string;
  type?: string;
  schedule?: string;
  retentionDays?: number;
  storageLocation?: string;
  includeSchemas?: string[];
  excludeTables?: string[];
  isActive?: boolean;
}

export interface RunBackupPayload {
  configId?: string;
  type?: string;
}

export const drApi = {
  listConfigs: () =>
    apiClient.get('/dr/backup-configs').then((r) => r.data.data as BackupConfig[]),
  createConfig: (data: CreateBackupConfigPayload) =>
    apiClient.post('/dr/backup-configs', data).then((r) => r.data.data),
  updateConfig: (id: string, data: Partial<CreateBackupConfigPayload>) =>
    apiClient.put(`/dr/backup-configs/${id}`, data).then((r) => r.data.data),
  listBackups: (params?: { status?: string }) =>
    apiClient.get('/dr/backups', { params }).then((r) => r.data.data as BackupExecution[]),
  runBackup: (data: RunBackupPayload) =>
    apiClient.post('/dr/backups/run', data).then((r) => r.data.data),
  getDrConfig: () =>
    apiClient.get('/dr/config').then((r) => r.data.data as DrConfig),
  updateDrConfig: (data: Partial<DrConfig>) =>
    apiClient.put('/dr/config', data).then((r) => r.data.data),
  runDrTest: () =>
    apiClient.post('/dr/test').then((r) => r.data.data),
};
