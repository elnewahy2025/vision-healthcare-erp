import type { FastifyInstance } from 'fastify';
import { registerPatientRoutes } from './patient.routes.js';

export async function registerPatientModule(app: FastifyInstance) {
  await registerPatientRoutes(app);
}

export type { PatientRow, PatientResponse, QuickSearchResult } from './types.js';
