import { db } from '../core/database.js';
import { sendNotification } from './notification.js';

interface ReminderConfig {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  doctorName: string;
  appointmentTime: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

// Send appointment reminder
export async function sendAppointmentReminder(config: ReminderConfig): Promise<boolean> {
  const { tenantId, patientName, doctorName, appointmentTime, clinicPhone } = config;

  // Email reminder
  if (config.patientEmail) {
    await sendNotification({
      tenantId,
      channel: 'email',
      recipient: config.patientEmail,
      templateKey: 'appointment_reminder',
      variables: {
        patientName,
        doctorName,
        appointmentTime,
        clinicPhone: clinicPhone || '',
      },
      locale: 'en',
    }).catch(() => {});
  }

  // SMS reminder
  if (config.patientPhone) {
    const smsBody = `Hi ${patientName}, this is a reminder for your appointment with Dr. ${doctorName} on ${appointmentTime}. Please arrive 10 minutes early. For cancellation, call ${clinicPhone || 'us'}.`;
    await sendNotification({
      tenantId,
      channel: 'sms',
      recipient: config.patientPhone,
      templateKey: 'appointment_reminder_sms',
      variables: {
        patientName,
        doctorName,
        appointmentTime,
        message: smsBody,
      },
      locale: 'en',
    }).catch(() => {});
  }

  return true;
}

// Send appointment confirmation
export async function sendAppointmentConfirmation(config: ReminderConfig): Promise<boolean> {
  const { tenantId, patientName, doctorName, appointmentTime, clinicPhone, clinicAddress } = config;

  if (config.patientEmail) {
    await sendNotification({
      tenantId,
      channel: 'email',
      recipient: config.patientEmail,
      templateKey: 'appointment_confirmation',
      variables: {
        patientName,
        doctorName,
        appointmentTime,
        clinicAddress: clinicAddress || '',
        clinicPhone: clinicPhone || '',
      },
      locale: 'en',
    }).catch(() => {});
  }

  if (config.patientPhone) {
    await sendNotification({
      tenantId,
      channel: 'sms',
      recipient: config.patientPhone,
      templateKey: 'appointment_confirmation_sms',
      variables: {
        patientName,
        doctorName,
        appointmentTime,
        message: `Your appointment with Dr. ${doctorName} is confirmed for ${appointmentTime}.`,
      },
      locale: 'en',
    }).catch(() => {});
  }

  return true;
}

// Process pending reminders (run via cron or BullMQ job)
export async function processPendingReminders(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pendingReminders = await db('appointment_reminders')
    .join('appointments', 'appointment_reminders.appointment_id', 'appointments.id')
    .join('patients', 'appointments.patient_id', 'patients.id')
    .join('users', 'appointments.doctor_id', 'users.id')
    .where('appointment_reminders.status', 'pending')
    .where('appointments.status', 'scheduled')
    .where('appointments.scheduled_date', '<=', tomorrow)
    .select(
      'appointment_reminders.*',
      'appointments.scheduled_date',
      'patients.first_name as patient_first_name',
      'patients.last_name as patient_last_name',
      'patients.phone as patient_phone',
      'patients.email as patient_email',
      'users.first_name as doctor_first_name',
      'users.last_name as doctor_last_name'
    );

  let sent = 0;
  let failed = 0;

  for (const reminder of pendingReminders) {
    try {
      const config: ReminderConfig = {
        tenantId: reminder.tenant_id,
        appointmentId: reminder.appointment_id,
        patientId: reminder.patient_id,
        patientName: `${reminder.patient_first_name} ${reminder.patient_last_name}`,
        patientPhone: reminder.patient_phone,
        patientEmail: reminder.patient_email,
        doctorName: `Dr. ${reminder.doctor_first_name} ${reminder.doctor_last_name}`,
        appointmentTime: new Date(reminder.scheduled_date).toLocaleString('en-EG', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      };

      await sendAppointmentReminder(config);
      await db('appointment_reminders').where({ id: reminder.id }).update({
        status: 'sent', sent_at: db.fn.now(),
      });
      sent++;
    } catch (error: any) {
      console.error(`✗ Reminder failed for appointment ${reminder.appointment_id}:`, error.message);
      await db('appointment_reminders').where({ id: reminder.id }).update({
        status: 'failed', error_message: error.message,
      });
      failed++;
    }
  }

  console.log(`✓ Reminders processed: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

// Auto-create reminders for new appointments (24h and 1h before)
export async function autoCreateReminders(appointmentId: string, tenantId: string): Promise<void> {
  const appointment = await db('appointments').where({ id: appointmentId, tenant_id: tenantId }).first();
  if (!appointment) return;

  const aptDate = new Date(appointment.scheduled_date);
  const reminder24h = new Date(aptDate.getTime() - 24 * 60 * 60 * 1000);
  const reminder1h = new Date(aptDate.getTime() - 60 * 60 * 1000);

  const reminders = [
    { appointment_id: appointmentId, tenant_id: tenantId, type: '24h', scheduled_for: reminder24h },
    { appointment_id: appointmentId, tenant_id: tenantId, type: '1h', scheduled_for: reminder1h },
  ];

  for (const r of reminders) {
    await db('appointment_reminders').insert({
      ...r,
      status: 'pending',
      channel: 'both',
    }).catch(() => {});
  }
}
