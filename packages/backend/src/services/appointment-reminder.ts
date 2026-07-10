import { db } from '../core/database.js';
import { sendEmail } from './email.js';
import { sendSms } from './sms.js';
import { logAudit } from './audit.js';

interface ReminderConfig {
  tenantId: string;
  appointmentId: string;
  patientId: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  type: 'email' | 'sms' | 'both';
  reminderTime: '24h' | '1h' | '30m';
}

export async function sendAppointmentReminder(config: ReminderConfig): Promise<boolean> {
  const timeLabel = config.reminderTime === '24h' ? 'tomorrow' :
                    config.reminderTime === '1h' ? 'in 1 hour' : 'in 30 minutes';

  const smsMessage = `Reminder: You have an appointment with Dr. ${config.doctorName} ${timeLabel} on ${config.appointmentDate} at ${config.appointmentTime}. Please arrive 10 minutes early. Reply CANCEL to cancel.`;

  const emailSubject = `Appointment Reminder - Dr. ${config.doctorName}`;
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0;">📅 Appointment Reminder</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px;">Dear ${config.patientName},</p>
        <p style="font-size: 16px;">This is a reminder for your upcoming appointment:</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Doctor:</strong> Dr. ${config.doctorName}</p>
          <p><strong>Date:</strong> ${config.appointmentDate}</p>
          <p><strong>Time:</strong> ${config.appointmentTime}</p>
        </div>
        <p style="font-size: 14px; color: #6b7280;">Please arrive 10 minutes early with your ID.</p>
      </div>
    </div>`;

  let success = true;

  if (config.type === 'sms' || config.type === 'both') {
    if (config.patientPhone) {
      const smsOk = await sendSms({ to: config.patientPhone, message: smsMessage });
      if (!smsOk) success = false;
    }
  }

  if (config.type === 'email' || config.type === 'both') {
    if (config.patientEmail) {
      const emailOk = await sendEmail({ to: config.patientEmail, subject: emailSubject, html: emailHtml });
      if (!emailOk) success = false;
    }
  }

  // Log the reminder
  await db('notification_logs').insert({
    tenant_id: config.tenantId,
    user_id: null,
    channel: config.type === 'both' ? 'email' : config.type,
    recipient: config.type === 'sms' ? config.patientPhone : config.patientEmail || '',
    template_key: 'appointment_reminder',
    body: smsMessage,
    status: success ? 'sent' : 'failed',
    sent_at: success ? db.fn.now() : null,
  }).catch(() => {});

  return success;
}

export async function sendBatchReminders(tenantId: string, reminderWindow: '24h' | '1h'): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  let startTime: Date;
  let endTime: Date;

  if (reminderWindow === '24h') {
    startTime = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  } else {
    startTime = new Date(now.getTime() + 55 * 60 * 1000);
    endTime = new Date(now.getTime() + 65 * 60 * 1000);
  }

  const appointments = await db('appointments')
    .join('patients', 'appointments.patient_id', 'patients.id')
    .leftJoin('users', 'appointments.doctor_id', 'users.id')
    .where('appointments.tenant_id', tenantId)
    .where('appointments.status', 'scheduled')
    .whereBetween('appointments.scheduled_date', [startTime, endTime])
    .select('appointments.*', 'patients.first_name', 'patients.last_name as patient_last',
            'patients.phone', 'patients.email',
            'users.first_name as doctor_first', 'users.last_name as doctor_last');

  let sent = 0;
  let failed = 0;

  for (const apt of appointments) {
    // Check if reminder already sent
    const alreadySent = await db('notification_logs')
      .where({ tenant_id: tenantId, template_key: 'appointment_reminder' })
      .whereRaw("metadata->>'appointmentId' = ?", [apt.id])
      .first();

    if (alreadySent) continue;

    const ok = await sendAppointmentReminder({
      tenantId,
      appointmentId: apt.id,
      patientId: apt.patient_id,
      doctorName: `Dr. ${apt.doctor_first} ${apt.doctor_last}`,
      appointmentDate: new Date(apt.scheduled_date).toLocaleDateString(),
      appointmentTime: new Date(apt.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      patientName: `${apt.first_name} ${apt.patient_last}`,
      patientPhone: apt.phone,
      patientEmail: apt.email,
      type: apt.email ? 'both' : 'sms',
      reminderTime: reminderWindow,
    });

    if (ok) sent++;
    else failed++;
  }

  await logAudit({ tenantId, action: 'reminder.batch', entityType: 'notification', metadata: { window: reminderWindow, sent, failed } });

  return { sent, failed };
}

export async function startReminderScheduler(tenantId: string): Promise<void> {
  // Run 24-hour reminders every hour, 1-hour reminders every 15 minutes
  setInterval(async () => {
    try {
      await sendBatchReminders(tenantId, '24h');
    } catch (err: any) {
      console.error('✗ 24h reminder batch failed:', err.message);
    }
  }, 60 * 60 * 1000);

  setInterval(async () => {
    try {
      await sendBatchReminders(tenantId, '1h');
    } catch (err: any) {
      console.error('✗ 1h reminder batch failed:', err.message);
    }
  }, 15 * 60 * 1000);
}
