import type { FastifyInstance } from 'fastify';
import { authenticate } from '../auth-guard.js';
import {
  listAppointments, getAppointment, createAppointment, updateAppointment,
  checkInAppointment, completeAppointment, cancelAppointment, todaySummary,
} from './appointment.controller.js';

export async function registerAppointmentRoutes(app: FastifyInstance) {
  app.get('/api/v1/appointments', { preHandler: [authenticate] }, listAppointments);
  app.get('/api/v1/appointments/today/summary', { preHandler: [authenticate] }, todaySummary);
  app.get('/api/v1/appointments/:appointmentId', { preHandler: [authenticate] }, getAppointment);
  app.post('/api/v1/appointments', { preHandler: [authenticate] }, createAppointment);
  app.put('/api/v1/appointments/:appointmentId', { preHandler: [authenticate] }, updateAppointment);
  app.post('/api/v1/appointments/:appointmentId/check-in', { preHandler: [authenticate] }, checkInAppointment);
  app.post('/api/v1/appointments/:appointmentId/complete', { preHandler: [authenticate] }, completeAppointment);
  app.post('/api/v1/appointments/:appointmentId/cancel', { preHandler: [authenticate] }, cancelAppointment);
}
