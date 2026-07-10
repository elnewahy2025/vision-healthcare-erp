import { db } from '../core/database.js';
import { sendEmail } from './email.js';
import { sendSms } from './sms.js';

interface NotificationData {
  tenantId: string;
  userId?: string;
  channel: 'email' | 'sms';
  recipient: string;
  templateKey: string;
  variables: Record<string, string>;
  locale?: string;
}

export async function sendNotification(data: NotificationData): Promise<boolean> {
  try {
    // Get template
    const template = await db('notification_templates')
      .where({ key: data.templateKey, channel: data.channel, locale: data.locale || 'en' })
      .andWhere(function () {
        this.whereNull('tenant_id').orWhere('tenant_id', data.tenantId);
      })
      .orderBy('tenant_id', 'asc') // tenant-specific overrides global
      .first();

    if (!template) {
      console.warn(`⚠️ No template found: ${data.templateKey}/${data.channel}/${data.locale}`);
      return false;
    }

    // Replace variables
    let subject = template.subject || '';
    let body = template.body;
    for (const [key, value] of Object.entries(data.variables)) {
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Send
    let sent = false;
    if (data.channel === 'email') {
      sent = await sendEmail({ to: data.recipient, subject, html: body.replace(/\n/g, '<br/>') });
    } else {
      sent = await sendSms({ to: data.recipient, message: body });
    }

    // Log
    await db('notification_logs').insert({
      tenant_id: data.tenantId,
      user_id: data.userId || null,
      channel: data.channel,
      recipient: data.recipient,
      template_key: data.templateKey,
      subject: subject || null,
      body,
      status: sent ? 'sent' : 'failed',
      error_message: sent ? null : 'Send failed',
      sent_at: sent ? new Date() : null,
    });

    return sent;
  } catch (error: any) {
    console.error('✗ Notification failed:', error.message);
    
    // Log failure
    await db('notification_logs').insert({
      tenant_id: data.tenantId,
      user_id: data.userId || null,
      channel: data.channel,
      recipient: data.recipient,
      template_key: data.templateKey,
      status: 'failed',
      error_message: error.message,
    });
    
    return false;
  }
}
