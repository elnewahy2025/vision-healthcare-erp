import type { FastifyInstance } from 'fastify';
import { registerAppointmentRoutes } from './appointment.routes.js';

export async function registerAppointmentModule(app: FastifyInstance) {
  await registerAppointmentRoutes(app);
}

export type { AppointmentRow, AppointmentResponse } from './types.js';
