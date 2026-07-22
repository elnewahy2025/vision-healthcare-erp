import type { FastifyRequest, FastifyReply } from 'fastify';
import { getCtx, getTenantId } from '../../utils/route-helper.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { createAppointmentSchema, updateAppointmentSchema, paginationSchema } from '../../utils/validation.js';
import { AppointmentNotFoundError, PatientNotFoundError } from '@healthcare/shared/errors';
import * as repo from './appointment.repository.js';
import { mapAppointment, calculateEndTime, generateTelemedicineLink } from './appointment.mapper.js';
import type { AppointmentRow } from './types.js';

export async function listAppointments(request: FastifyRequest, reply: FastifyReply) {
  const query = paginationSchema.parse(request.query);
  const tenantId = getTenantId(request);
  const { date, status, doctorId, patientId, branchId } = request.query as Record<string, string | undefined>;

  const { appointments, total } = await repo.findAppointments(tenantId, {
    date, status, doctorId, patientId, branchId,
    sort: query.sort, order: query.order,
    limit: query.limit, offset: (query.page - 1) * query.limit,
  });

  return sendPaginated(reply, appointments.map(mapAppointment), total, query.page, query.limit);
}

export async function getAppointment(request: FastifyRequest, reply: FastifyReply) {
  const { appointmentId } = request.params as { appointmentId: string };
  const tenantId = getTenantId(request);

  const appointment = await repo.findAppointmentById(appointmentId, tenantId);
  if (!appointment) throw new AppointmentNotFoundError(appointmentId);
  return sendSuccess(reply, mapAppointment(appointment));
}

export async function createAppointment(request: FastifyRequest, reply: FastifyReply) {
  const body = createAppointmentSchema.parse(request.body);
  const tenantId = getTenantId(request);
  const { userId } = getCtx(request);

  const patient = await repo.findPatientForAppointment(body.patientId, tenantId);
  if (!patient) throw new PatientNotFoundError(body.patientId);

  const endTime = calculateEndTime(body.startTime, body.duration);
  const appointment = await repo.insertAppointment({
    tenant_id: tenantId, patient_id: body.patientId, doctor_id: body.doctorId,
    branch_id: body.branchId, appointment_date: body.appointmentDate,
    start_time: body.startTime, end_time: endTime, duration: body.duration,
    type: body.type, reason: body.reason || null, notes: body.notes || null,
    is_walk_in: body.isWalkIn, is_virtual: body.isVirtual,
    telemedicine_link: body.isVirtual ? generateTelemedicineLink() : null,
    status: 'scheduled', created_by: userId,
  });

  return sendSuccess(reply, mapAppointment(appointment), 'Appointment created successfully', 201);
}

export async function updateAppointment(request: FastifyRequest, reply: FastifyReply) {
  const { appointmentId } = request.params as { appointmentId: string };
  const body = updateAppointmentSchema.parse(request.body);
  const tenantId = getTenantId(request);

  const existing = await repo.findAppointmentById(appointmentId, tenantId);
  if (!existing) throw new AppointmentNotFoundError(appointmentId);

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (body.appointmentDate) updateData.appointment_date = body.appointmentDate;
  if (body.startTime) {
    updateData.start_time = body.startTime;
    updateData.end_time = calculateEndTime(body.startTime, body.duration || existing.duration);
  }
  if (body.duration) updateData.duration = body.duration;
  if (body.type) updateData.type = body.type;
  if (body.reason !== undefined) updateData.reason = body.reason;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.doctorId) updateData.doctor_id = body.doctorId;
  if (body.isVirtual !== undefined) {
    updateData.is_virtual = body.isVirtual;
    if (body.isVirtual && !existing.telemedicine_link) {
      updateData.telemedicine_link = generateTelemedicineLink();
    }
  }

  const updated = await repo.updateAppointmentById(appointmentId, updateData);
  return sendSuccess(reply, mapAppointment(updated!), 'Appointment updated successfully');
}

export async function checkInAppointment(request: FastifyRequest, reply: FastifyReply) {
  const { appointmentId } = request.params as { appointmentId: string };
  const tenantId = getTenantId(request);

  const existing = await repo.findAppointmentById(appointmentId, tenantId);
  if (!existing) throw new AppointmentNotFoundError(appointmentId);

  const updated = await repo.updateAppointmentById(appointmentId, {
    status: 'checked_in', check_in_time: new Date().toISOString(), updated_at: new Date(),
  });
  return sendSuccess(reply, mapAppointment(updated!), 'Patient checked in');
}

export async function completeAppointment(request: FastifyRequest, reply: FastifyReply) {
  const { appointmentId } = request.params as { appointmentId: string };
  const tenantId = getTenantId(request);

  const existing = await repo.findAppointmentById(appointmentId, tenantId);
  if (!existing) throw new AppointmentNotFoundError(appointmentId);

  const updated = await repo.updateAppointmentById(appointmentId, {
    status: 'completed', check_out_time: new Date().toISOString(), updated_at: new Date(),
  });
  return sendSuccess(reply, mapAppointment(updated!), 'Appointment completed');
}

export async function cancelAppointment(request: FastifyRequest, reply: FastifyReply) {
  const { appointmentId } = request.params as { appointmentId: string };
  const tenantId = getTenantId(request);
  const { reason } = request.body as { reason?: string };

  const existing = await repo.findAppointmentById(appointmentId, tenantId);
  if (!existing) throw new AppointmentNotFoundError(appointmentId);

  const updated = await repo.updateAppointmentById(appointmentId, {
    status: 'cancelled', cancelled_at: new Date().toISOString(),
    cancel_reason: reason || null, updated_at: new Date(),
  });
  return sendSuccess(reply, mapAppointment(updated!), 'Appointment cancelled');
}

export async function todaySummary(request: FastifyRequest, reply: FastifyReply) {
  const tenantId = getTenantId(request);
  const today = new Date().toISOString().split('T')[0];

  const appointments = await repo.findTodayAppointments(tenantId, today);

  const counts = {
    total: appointments.length,
    scheduled: appointments.filter((a: AppointmentRow) => a.status === 'scheduled').length,
    checkedIn: appointments.filter((a: AppointmentRow) => a.status === 'checked_in').length,
    inProgress: appointments.filter((a: AppointmentRow) => a.status === 'in_progress').length,
    completed: appointments.filter((a: AppointmentRow) => a.status === 'completed').length,
    cancelled: appointments.filter((a: AppointmentRow) => a.status === 'cancelled').length,
    noShow: appointments.filter((a: AppointmentRow) => a.status === 'no_show').length,
  };

  return sendSuccess(reply, { counts, appointments: appointments.map(mapAppointment) });
}
