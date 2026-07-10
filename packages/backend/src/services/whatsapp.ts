import { getEnv } from '@healthcare/shared/config';
import { db } from '../core/database.js';

interface WhatsAppSendOptions {
  tenantId: string;
  to: string;
  templateName?: string;
  templateParams?: string[];
  message?: string;
  mediaUrl?: string;
  messageType?: 'text' | 'template' | 'image' | 'document';
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: any[];
}

let whatsappClient: any = null;

async function getAccessToken(): Promise<string | null> {
  const env = getEnv();
  if (!env.WHATSAPP_API_TOKEN) return null;
  return env.WHATSAPP_API_TOKEN;
}

async function getPhoneNumberId(): Promise<string | null> {
  const env = getEnv();
  return env.WHATSAPP_PHONE_NUMBER_ID || null;
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  params: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const env = getEnv();
  const phoneNumberId = await getPhoneNumberId();
  const token = await getAccessToken();

  if (!token || !phoneNumberId) {
    console.log('[WHATSAPP DEV] Template:', { to, templateName, params });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: params.map((p) => ({ type: 'text', text: p })),
              },
            ],
          },
        }),
      }
    );

    const data = await response.json();
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Unknown WhatsApp error' };
  } catch (error: any) {
    console.error('✗ WhatsApp template send failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendTextMessage(
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const env = getEnv();
  const phoneNumberId = await getPhoneNumberId();
  const token = await getAccessToken();

  if (!token || !phoneNumberId) {
    console.log('[WHATSAPP DEV] Text:', { to, text: text.substring(0, 100) });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const data = await response.json();
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Unknown WhatsApp error' };
  } catch (error: any) {
    console.error('✗ WhatsApp text send failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendMediaMessage(
  to: string,
  mediaUrl: string,
  mediaType: 'image' | 'document',
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const phoneNumberId = await getPhoneNumberId();
  const token = await getAccessToken();

  if (!token || !phoneNumberId) {
    console.log('[WHATSAPP DEV] Media:', { to, mediaUrl, mediaType });
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const body: any = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^0-9]/g, ''),
      type: mediaType,
      [mediaType]: { link: mediaUrl, ...(caption ? { caption } : {}) },
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Media send failed' };
  } catch (error: any) {
    console.error('✗ WhatsApp media send failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppMessage(options: WhatsAppSendOptions): Promise<boolean> {
  try {
    let result;

    if (options.templateName && options.templateParams) {
      result = await sendTemplateMessage(
        options.to,
        options.templateName,
        options.templateParams[0] || 'en',
        options.templateParams.slice(1)
      );
    } else if (options.mediaUrl && options.messageType !== 'text') {
      result = await sendMediaMessage(
        options.to,
        options.mediaUrl,
        options.messageType === 'image' ? 'image' : 'document',
        options.message
      );
    } else if (options.message) {
      result = await sendTextMessage(options.to, options.message);
    } else {
      console.warn('⚠️ WhatsApp: No message content provided');
      return false;
    }

    // Log to whatsapp_messages table
    await db('whatsapp_messages').insert({
      tenant_id: options.tenantId,
      to_number: options.to,
      message: options.message || null,
      template_name: options.templateName || null,
      message_type: options.messageType || 'text',
      external_id: result.messageId || null,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
    });

    return result.success;
  } catch (error: any) {
    console.error('✗ WhatsApp send error:', error.message);
    await db('whatsapp_messages').insert({
      tenant_id: options.tenantId,
      to_number: options.to,
      message: options.message || null,
      template_name: options.templateName || null,
      message_type: options.messageType || 'text',
      status: 'failed',
      error_message: error.message,
    }).catch(() => {});
    return false;
  }
}

export function parseWhatsAppWebhook(body: any): {
  type: 'message' | 'status' | 'unknown';
  data: any;
} {
  try {
    if (!body?.entry?.[0]?.changes?.[0]?.value) {
      return { type: 'unknown', data: body };
    }

    const value = body.entry[0].changes[0].value;

    // Inbound message
    if (value.messages?.[0]) {
      return {
        type: 'message',
        data: {
          from: value.messages[0].from,
          messageId: value.messages[0].id,
          timestamp: value.messages[0].timestamp,
          type: value.messages[0].type,
          text: value.messages[0].text?.body || null,
          contact: value.contacts?.[0]?.profile?.name || null,
        },
      };
    }

    // Status update
    if (value.statuses?.[0]) {
      return {
        type: 'status',
        data: {
          messageId: value.statuses[0].id,
          status: value.statuses[0].status,
          timestamp: value.statuses[0].timestamp,
          errors: value.statuses[0].errors || [],
        },
      };
    }

    return { type: 'unknown', data: value };
  } catch {
    return { type: 'unknown', data: body };
  }
}

export async function getWhatsAppStats(tenantId: string): Promise<any> {
  const total = await db('whatsapp_messages').where({ tenant_id: tenantId }).count('id as count').first();
  const byStatus = await db('whatsapp_messages').where({ tenant_id: tenantId })
    .select('status').count('id as count').groupBy('status');
  const byType = await db('whatsapp_messages').where({ tenant_id: tenantId })
    .select('message_type').count('id as count').groupBy('message_type');
  const today = await db('whatsapp_messages')
    .where({ tenant_id: tenantId })
    .whereRaw("created_at >= CURRENT_DATE")
    .count('id as count').first();

  return {
    total: Number(total?.count || 0),
    today: Number(today?.count || 0),
    byStatus,
    byType,
  };
}
