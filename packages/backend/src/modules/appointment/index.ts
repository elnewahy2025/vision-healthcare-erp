import { getCtx, getTenantId } from "../../utils/route-helper.js";
import type { FastifyInstance } from 'fastify';
import { db } from '../../core/database.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';
import { createAppointmentSchema, updateAppointmentSchema, paginationSchema } from '../../utils/validation.js';
import { AppointmentNotFoundError, PatientNotFoundError } from '@healthcare/shared/errors';

export async function registerAppointmentModule(app: FastifyInstance) {
  // List appointments
  app.get('/api/v1/appointments', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const query = paginationSchema.parse(request.query);
    const tenantId = getTenantId(request);
    const { date, status, doctorId, patientId, branchId } = request.query as any;

    let queryBuilder = db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .join('users', 'appointments.doctor_id', 'users.id')
      .where('appointments.tenant_id', tenantId)
      .whereNull('appointments.deleted_at');

    if (date) queryBuilder = queryBuilder.andWhere('appointments.appointment_date', date);
    if (status) queryBuilder = queryBuilder.andWhere('appointments.status', status);
    if (doctorId) queryBuilder = queryBuilder.andWhere('appointments.doctor_id', doctorId);
    if (patientId) queryBuilder = queryBuilder.andWhere('appointments.patient_id', patientId);
    if (branchId) queryBuilder = queryBuilder.andWhere('appointments.branch_id', branchId);

    const total = await queryBuilder.clone().count('appointments.id as count').first();
    const appointments = await queryBuilder
      .select(
        'appointments.*',
        'patients.first_name as patient_first_name',
        'patients.last_name as patient_last_name',
        'patients.medical_record_number',
        'users.first_name as doctor_first_name',
        'users.last_name as doctor_last_name',
      )
      .orderBy('appointments.appointment_date', query.order || 'desc')
      .orderBy('appointments.start_time', 'asc')
      .limit(query.limit)
      .offset((query.page - 1) * query.limit);

    const mapped = appointments.map(mapAppointment);
    return sendPaginated(reply, mapped, Number(total?.count || 0), query.page, query.limit);
  });

  // Get single appointment
  app.get('/api/v1/appointments/:appointmentId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { appointmentId } = request.params as any;
    const tenantId = getTenantId(request);

    const appointment = await db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .join('users', 'appointments.doctor_id', 'users.id')
      .where('appointments.id', appointmentId)
      .where('appointments.tenant_id', tenantId)
      .select(
        'appointments.*',
        'patients.first_name as patient_first_name',
        'patients.last_name as patient_last_name',
        'patients.medical_record_number',
        'patients.date_of_birth as patient_dob',
        'patients.gender as patient_gender',
        'patients.phone as patient_phone',
        'users.first_name as doctor_first_name',
        'users.last_name as doctor_last_name',
      )
      .first();

    if (!appointment) throw new AppointmentNotFoundError(appointmentId);
    return sendSuccess(reply, mapAppointment(appointment));
  });

  // Create appointment
  app.post('/api/v1/appointments', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const body = createAppointmentSchema.parse(request.body);
    const tenantId = getTenantId(request); const userId = getCtx(request).userId;

    const patient = await db('patients')
      .where({ id: body.patientId, tenant_id: tenantId })
      .first();
    if (!patient) throw new PatientNotFoundError(body.patientId);

    const endTime = calculateEndTime(body.startTime, body.duration);

    const [appointment] = await db('appointments').insert({
      tenant_id: tenantId,
      patient_id: body.patientId,
      doctor_id: body.doctorId,
      branch_id: body.branchId,
      appointment_date: body.appointmentDate,
      start_time: body.startTime,
      end_time: endTime,
      duration: body.duration,
      type: body.type,
      reason: body.reason || null,
      notes: body.notes || null,
      is_walk_in: body.isWalkIn,
      is_virtual: body.isVirtual,
      telemedicine_link: body.isVirtual ? generateTelemedicineLink() : null,
      status: 'scheduled',
      created_by: userId,
    }).returning('*');

    return sendSuccess(reply, mapAppointment(appointment), 'Appointment created successfully', 201);
  });

  // Update appointment
  app.put('/api/v1/appointments/:appointmentId', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { appointmentId } = request.params as any;
    const body = updateAppointmentSchema.parse(request.body);
    const tenantId = getTenantId(request);

    const existing = await db('appointments')
      .where({ id: appointmentId, tenant_id: tenantId })
      .first();
    if (!existing) throw new AppointmentNotFoundError(appointmentId);

    const updateData: any = { updated_at: new Date() };
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

    const [updated] = await db('appointments')
      .where({ id: appointmentId })
      .update(updateData)
      .returning('*');

    return sendSuccess(reply, mapAppointment(updated), 'Appointment updated successfully');
  });

  // Check-in patient
  app.post('/api/v1/appointments/:appointmentId/check-in', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { appointmentId } = request.params as any;
    const tenantId = getTenantId(request);

    const existing = await db('appointments')
      .where({ id: appointmentId, tenant_id: tenantId })
      .first();
    if (!existing) throw new AppointmentNotFoundError(appointmentId);

    const [updated] = await db('appointments')
      .where({ id: appointmentId })
      .update({
        status: 'checked_in',
        check_in_time: new Date().toISOString(),
        updated_at: new Date(),
      })
      .returning('*');

    return sendSuccess(reply, mapAppointment(updated), 'Patient checked in');
  });

  // Complete appointment
  app.post('/api/v1/appointments/:appointmentId/complete', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { appointmentId } = request.params as any;
    const tenantId = getTenantId(request);

    const existing = await db('appointments')
      .where({ id: appointmentId, tenant_id: tenantId })
      .first();
    if (!existing) throw new AppointmentNotFoundError(appointmentId);

    const [updated] = await db('appointments')
      .where({ id: appointmentId })
      .update({
        status: 'completed',
        check_out_time: new Date().toISOString(),
        updated_at: new Date(),
      })
      .returning('*');

    return sendSuccess(reply, mapAppointment(updated), 'Appointment completed');
  });

  // Cancel appointment
  app.post('/api/v1/appointments/:appointmentId/cancel', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const { appointmentId } = request.params as any;
    const tenantId = getTenantId(request);
    const { reason } = request.body as any;

    const existing = await db('appointments')
      .where({ id: appointmentId, tenant_id: tenantId })
      .first();
    if (!existing) throw new AppointmentNotFoundError(appointmentId);

    const [updated] = await db('appointments')
      .where({ id: appointmentId })
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: reason || null,
        updated_at: new Date(),
      })
      .returning('*');

    return sendSuccess(reply, mapAppointment(updated), 'Appointment cancelled');
  });

  // Today's appointments
  app.get('/api/v1/appointments/today/summary', {
    preHandler: [(r: any, rep: any) => { (r.server as any).authenticate(r, rep); }],
  }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const today = new Date().toISOString().split('T')[0];

    const appointments = await db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .join('users', 'appointments.doctor_id', 'users.id')
      .where('appointments.tenant_id', tenantId)
      .where('appointments.appointment_date', today)
      .whereNull('appointments.deleted_at')
      .select(
        'appointments.*',
        'patients.first_name as patient_first_name',
        'patients.last_name as patient_last_name',
        'patients.medical_record_number',
        'users.first_name as doctor_first_name',
        'users.last_name as doctor_last_name',
      )
      .orderBy('appointments.start_time', 'asc');

    const counts = {
      total: appointments.length,
      scheduled: appointments.filter((a: any) => a.status === 'scheduled').length,
      checkedIn: appointments.filter((a: any) => a.status === 'checked_in').length,
      inProgress: appointments.filter((a: any) => a.status === 'in_progress').length,
      completed: appointments.filter((a: any) => a.status === 'completed').length,
      cancelled: appointments.filter((a: any) => a.status === 'cancelled').length,
      noShow: appointments.filter((a: any) => a.status === 'no_show').length,
    };

    return sendSuccess(reply, {
      counts,
      appointments: appointments.map(mapAppointment),
    });
  });
}

function mapAppointment(a: any) {
  return {
    id: a.id,
    tenantId: a.tenant_id,
    patientId: a.patient_id,
    doctorId: a.doctor_id,
    branchId: a.branch_id,
    appointmentDate: a.appointment_date,
    startTime: a.start_time,
    endTime: a.end_time,
    duration: a.duration,
    type: a.type,
    status: a.status,
    reason: a.reason,
    notes: a.notes,
    isWalkIn: a.is_walk_in,
    isVirtual: a.is_virtual,
    telemedicineLink: a.telemedicine_link,
    reminderSent: a.reminder_sent,
    checkInTime: a.check_in_time,
    checkOutTime: a.check_out_time,
    cancelledAt: a.cancelled_at,
    cancelReason: a.cancel_reason,
    rescheduledFrom: a.rescheduled_from,
    patientName: a.patient_first_name && a.patient_last_name ? `${a.patient_first_name} ${a.patient_last_name}` : undefined,
    patientMrn: a.medical_record_number,
    patientDob: a.patient_dob,
    patientGender: a.patient_gender,
    patientPhone: a.patient_phone,
    doctorName: a.doctor_first_name && a.doctor_last_name ? `${a.doctor_first_name} ${a.doctor_last_name}` : undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function generateTelemedicineLink(): string {
  const id = Math.random().toString(36).substring(2, 10);
  return `https://meet.visionhealthcare.com/${id}`;
}
