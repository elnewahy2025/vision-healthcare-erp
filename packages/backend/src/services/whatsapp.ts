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

interface WhatsAppTemplateComponent {
  type: string;
  parameters?: Array<{ type: string; text: string }>;
}

interface WhatsAppTemplate {
  name: string;
  language: string;
  components: WhatsAppTemplateComponent[];
}

interface WhatsAppApiResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; code: number; type: string; error_subcode?: number };
}

interface WhatsAppWebhookMessage {
  type: 'message' | 'status' | 'unknown';
  data: {
    from?: string;
    messageId?: string;
    timestamp?: string;
    type?: string;
    text?: string;
    contact?: string;
    status?: string;
    errors?: Array<{ code: number; title: string; message: string; error_data?: { details: string } }>;
  };
}

let whatsappClient: Record<string, unknown> | null = null;

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

    const data = await response.json() as WhatsAppApiResponse;
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Unknown WhatsApp error' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
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

    const data = await response.json() as WhatsAppApiResponse;
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Unknown WhatsApp error' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
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
    return { success: true, messageId: `dev_${Date.now()}` };
  }

  try {
    const mediaObj: Record<string, string> = { link: mediaUrl };
    if (caption) mediaObj.caption = caption;

    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^0-9]/g, ''),
      type: mediaType,
      [mediaType]: mediaObj,
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

    const data = await response.json() as WhatsAppApiResponse;
    if (data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || 'Media send failed' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
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
      return false;
    }

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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    await db('whatsapp_messages').insert({
      tenant_id: options.tenantId,
      to_number: options.to,
      message: options.message || null,
      template_name: options.templateName || null,
      message_type: options.messageType || 'text',
      status: 'failed',
      error_message: msg,
    }).catch(() => {});
    return false;
  }
}

export function parseWhatsAppWebhook(body: Record<string, unknown>): WhatsAppWebhookMessage {
  try {
    const entry = body.entry as Array<Record<string, unknown>> | undefined;
    const changes = entry?.[0]?.changes as Array<Record<string, unknown>> | undefined;
    const value = changes?.[0]?.value as Record<string, unknown> | undefined;

    if (!value) {
      return { type: 'unknown', data: {} };
    }

    const messages = value.messages as Array<Record<string, unknown>> | undefined;
    if (messages?.[0]) {
      const msg = messages[0];
      const textObj = msg.text as Record<string, unknown> | undefined;
      const contacts = value.contacts as Array<Record<string, unknown>> | undefined;
      const profile = contacts?.[0]?.profile as Record<string, unknown> | undefined;
      return {
        type: 'message',
        data: {
          from: String(msg.from || ''),
          messageId: String(msg.id || ''),
          timestamp: String(msg.timestamp || ''),
          type: String(msg.type || 'text'),
          text: String(textObj?.body || ''),
          contact: String(profile?.name || ''),
        },
      };
    }

    const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
    if (statuses?.[0]) {
      const st = statuses[0];
      return {
        type: 'status',
        data: {
          messageId: String(st.id || ''),
          status: String(st.status || ''),
          timestamp: String(st.timestamp || ''),
          errors: (st.errors as WhatsAppWebhookMessage['data']['errors']) || [],
        },
      };
    }

    return { type: 'unknown', data: {} };
  } catch {
    return { type: 'unknown', data: {} };
  }
}

export async function getWhatsAppStats(tenantId: string): Promise<{
  total: number;
  today: number;
  byStatus: Array<{ status: string; count: string | number }>;
  byType: Array<{ message_type: string; count: string | number }>;
}> {
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
    byStatus: byStatus as Array<{ status: string; count: string | number }>,
    byType: byType as Array<{ message_type: string; count: string | number }>,
  };
}
