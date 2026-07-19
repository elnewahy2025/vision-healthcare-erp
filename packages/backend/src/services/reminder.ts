import { db } from '../core/database.js';
import { sendNotification } from './notification.js';
import { logAudit } from './audit.js';

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderService(): void {
  // Check every 5 minutes for upcoming appointments needing reminders
  reminderInterval = setInterval(async () => {
    try {
      await checkAndSendReminders();
    } catch (error: any) {
      console.error('✗ Reminder service error:', error.message);
    }
  }, 5 * 60 * 1000);

  // Also run immediately on startup (after a short delay)
  setTimeout(() => {
    checkAndSendReminders().catch(() => {});
  }, 30000);

  console.log('✓ Appointment reminder service started (checks every 5 minutes)');
}

export function stopReminderService(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

async function checkAndSendReminders(): Promise<void> {
  const now = new Date();

  // Find appointments in the next 24 hours that haven't had reminders sent
  const upcomingAppointments = await db('appointments')
    .join('patients', 'appointments.patient_id', 'patients.id')
    .join('tenants', 'appointments.tenant_id', 'tenants.id')
    .where('appointments.status', 'scheduled')
    .whereRaw("appointments.appointment_date > NOW()")
    .whereRaw("appointments.appointment_date <= NOW() + INTERVAL '24 hours'")
    .whereRaw("COALESCE((appointments.metadata->>'reminder_sent'), 'false') != 'true'")
    .select(
      'appointments.id as appointment_id',
      'appointments.tenant_id',
      'appointments.appointment_date',
      'appointments.type',
      'appointments.reason',
      'patients.first_name',
      'patients.last_name',
      'patients.phone',
      'patients.email',
      'tenants.name as clinic_name',
      'tenants.slug as tenant_slug',
    )
    .limit(50);

  if (upcomingAppointments.length === 0) return;

  console.log(`📧 Sending ${upcomingAppointments.length} appointment reminders...`);

  let sentCount = 0;

  for (const apt of upcomingAppointments) {
    try {
      const aptDate = new Date(apt.appointment_date);
      const timeStr = aptDate.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' });
      const dateStr = aptDate.toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      const hoursUntil = Math.floor((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      let reminderType = 'appointment_reminder_24h';
      if (hoursUntil <= 3) reminderType = 'appointment_reminder_3h';
      else if (hoursUntil <= 24) reminderType = 'appointment_reminder_24h';

      // Send SMS
      if (apt.phone) {
        await sendNotification({
          tenantId: apt.tenant_id,
          channel: 'sms',
          recipient: apt.phone,
          templateKey: reminderType,
          variables: {
            patientName: `${apt.first_name} ${apt.last_name}`,
            doctorName: 'the doctor',
            clinicName: apt.clinic_name || 'Vision Healthcare',
            date: dateStr,
            time: timeStr,
            hoursUntil: String(hoursUntil),
            reason: apt.reason || 'follow-up',
          },
        });
        sentCount++;
      }

      // Send Email
      if (apt.email) {
        await sendNotification({
          tenantId: apt.tenant_id,
          channel: 'email',
          recipient: apt.email,
          templateKey: reminderType,
          variables: {
            patientName: `${apt.first_name} ${apt.last_name}`,
            doctorName: 'the doctor',
            clinicName: apt.clinic_name || 'Vision Healthcare',
            date: dateStr,
            time: timeStr,
            hoursUntil: String(hoursUntil),
            reason: apt.reason || 'follow-up',
          },
        });
        sentCount++;
      }

      // Mark as sent in metadata
      await db('appointments')
        .where({ id: apt.appointment_id })
        .update({
          metadata: db.raw("jsonb_set(COALESCE(metadata, '{}'), '{reminder_sent}', 'true')"),
        });

      await logAudit({
        tenantId: apt.tenant_id,
        action: 'reminder.sent',
        entityType: 'appointment',
        entityId: apt.appointment_id,
        metadata: { type: reminderType, phone: apt.phone, email: apt.email },
      });
    } catch (error: any) {
      console.error(`✗ Reminder failed for ${apt.first_name}:`, error.message);
    }
  }

  if (sentCount > 0) {
    console.log(`✓ Sent ${sentCount} appointment reminders`);
  }
}

export async function sendManualReminder(appointmentId: string, tenantId: string): Promise<boolean> {
  try {
    const apt = await db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .join('tenants', 'appointments.tenant_id', 'tenants.id')
      .where('appointments.id', appointmentId)
      .select('appointments.*', 'patients.first_name', 'patients.last_name', 'patients.phone', 'patients.email', 'tenants.name as clinic_name')
      .first();

    if (!apt) return false;

    const aptDate = new Date(apt.appointment_date);
    const timeStr = aptDate.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' });
    const dateStr = aptDate.toLocaleDateString('en-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    if (apt.phone) {
      await sendNotification({
        tenantId, channel: 'sms', recipient: apt.phone,
        templateKey: 'appointment_reminder_manual',
        variables: { patientName: `${apt.first_name} ${apt.last_name}`, date: dateStr, time: timeStr, clinicName: apt.clinic_name || 'Vision Healthcare' },
      });
    }

    if (apt.email) {
      await sendNotification({
        tenantId, channel: 'email', recipient: apt.email,
        templateKey: 'appointment_reminder_manual',
        variables: { patientName: `${apt.first_name} ${apt.last_name}`, date: dateStr, time: timeStr, clinicName: apt.clinic_name || 'Vision Healthcare' },
      });
    }

    return true;
  } catch (error: any) {
    console.error('✗ Manual reminder failed:', error.message);
    return false;
  }
}
