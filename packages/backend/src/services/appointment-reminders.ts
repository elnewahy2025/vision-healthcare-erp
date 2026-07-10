import { db } from '../core/database.js';
import { sendNotification } from './notification.js';
import { logAudit } from './audit.js';

interface ReminderConfig {
  reminderMinutesBefore: number; // e.g. 60 = 1 hour before
  sendEmail: boolean;
  sendSms: boolean;
  sendWhatsApp: boolean;
  enabled: boolean;
}

const DEFAULT_CONFIG: ReminderConfig = {
  reminderMinutesBefore: 60,
  sendEmail: true,
  sendSms: true,
  sendWhatsApp: false,
  enabled: true,
};

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderCron(config?: Partial<ReminderConfig>): void {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  if (!mergedConfig.enabled) {
    console.log('✓ Appointment reminders disabled');
    return;
  }

  // Run every 5 minutes
  reminderInterval = setInterval(async () => {
    await processReminders(mergedConfig);
  }, 5 * 60 * 1000);

  // Also run immediately on start
  processReminders(mergedConfig);

  console.log(`✓ Appointment reminders started (every ${mergedConfig.reminderMinutesBefore} min before)`);
}

export function stopReminderCron(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log('✓ Appointment reminders stopped');
  }
}

async function processReminders(config: ReminderConfig): Promise<void> {
  try {
    // Find appointments that need reminders (scheduled, upcoming, not yet reminded)
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + config.reminderMinutesBefore * 60 * 1000);

    // Get appointments that are within the reminder window
    const appointments = await db('appointments')
      .join('patients', 'appointments.patient_id', 'patients.id')
      .where('appointments.status', 'scheduled')
      .whereBetween('appointments.scheduled_date', [now.toISOString(), reminderWindow.toISOString()])
      .select(
        'appointments.*',
        'patients.first_name',
        'patients.last_name',
        'patients.email',
        'patients.phone',
        'patients.id as patient_id',
        'patients.tenant_id'
      );

    let sentCount = 0;

    for (const apt of appointments) {
      // Check if reminder was already sent for this appointment
      const existingReminder = await db('notification_logs')
        .where({ tenant_id: apt.tenant_id, template_key: 'appointment_reminder' })
        .andWhereRaw("metadata::text LIKE ?", [`%${apt.id}%`])
        .first();

      if (existingReminder) continue;

      const aptDate = new Date(apt.scheduled_date);
      const minutesUntil = Math.round((aptDate.getTime() - now.getTime()) / 60000);

      // Send email reminder
      if (config.sendEmail && apt.email) {
        await sendNotification({
          tenantId: apt.tenant_id,
          userId: apt.doctor_id,
          channel: 'email',
          recipient: apt.email,
          templateKey: 'appointment_reminder',
          variables: {
            patientName: `${apt.first_name} ${apt.last_name}`,
            doctorName: `Dr. ${apt.first_name}`,
            appointmentDate: aptDate.toLocaleDateString('en-EG'),
            appointmentTime: aptDate.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' }),
            minutesUntil: String(minutesUntil),
          },
          locale: 'en',
        });
        sentCount++;
      }

      // Send SMS reminder
      if (config.sendSms && apt.phone) {
        await sendNotification({
          tenantId: apt.tenant_id,
          userId: apt.doctor_id,
          channel: 'sms',
          recipient: apt.phone,
          templateKey: 'appointment_reminder',
          variables: {
            patientName: `${apt.first_name} ${apt.last_name}`,
            doctorName: `Dr. ${apt.first_name}`,
            appointmentDate: aptDate.toLocaleDateString('en-EG'),
            appointmentTime: aptDate.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' }),
            minutesUntil: String(minutesUntil),
          },
          locale: 'en',
        });
        sentCount++;
      }

      // Log the reminder was sent (prevent duplicate sends)
      await db('notification_logs').insert({
        tenant_id: apt.tenant_id,
        user_id: apt.doctor_id,
        channel: 'system',
        recipient: apt.email || apt.phone || 'unknown',
        template_key: 'appointment_reminder',
        subject: `Appointment Reminder - ${aptDate.toLocaleDateString('en-EG')}`,
        body: `Reminder: Appointment in ${minutesUntil} minutes`,
        status: 'sent',
        metadata: JSON.stringify({ appointmentId: apt.id, patientId: apt.patient_id }),
        sent_at: now,
      }).catch(() => {});
    }

    if (sentCount > 0) {
      console.log(`  → Sent ${sentCount} appointment reminders`);
    }
  } catch (error: any) {
    console.error('✗ Reminder cron error:', error.message);
  }
}

// Get reminder stats for a tenant
export async function getReminderStats(tenantId: string): Promise<any> {
  const total = await db('notification_logs')
    .where({ tenant_id: tenantId, template_key: 'appointment_reminder' })
    .count('id as count').first();
  const today = await db('notification_logs')
    .where({ tenant_id: tenantId, template_key: 'appointment_reminder' })
    .whereRaw("DATE(created_at) = CURRENT_DATE")
    .count('id as count').first();
  const upcoming = await db('appointments')
    .where({ tenant_id: tenantId, status: 'scheduled' })
    .where('scheduled_date', '>', new Date().toISOString())
    .count('id as count').first();

  return {
    totalRemindersSent: Number(total?.count || 0),
    todayRemindersSent: Number(today?.count || 0),
    upcomingAppointments: Number(upcoming?.count || 0),
  };
}
