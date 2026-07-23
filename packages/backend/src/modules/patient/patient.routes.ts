import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth-guard.js';
import { listPatients, getPatient, createPatient, updatePatient, deletePatient, quickSearch, mergePatients, bulkImport } from './patient.controller.js';

export async function registerPatientRoutes(app: FastifyInstance) {
  app.get('/api/v1/patients', { preHandler: [authenticate] }, listPatients);
  app.get('/api/v1/patients/search/quick', { preHandler: [authenticate] }, quickSearch);
  app.get('/api/v1/patients/:patientId', { preHandler: [authenticate] }, getPatient);
  app.post('/api/v1/patients', { preHandler: [authenticate] }, createPatient);
  app.put('/api/v1/patients/:patientId', { preHandler: [authenticate] }, updatePatient);
  app.delete('/api/v1/patients/:patientId', { preHandler: [authenticate] }, deletePatient);
  app.post('/api/v1/patients/merge', { preHandler: [authenticate] }, mergePatients);
  app.post('/api/v1/patients/bulk-import', { preHandler: [authenticate] }, bulkImport);
}
