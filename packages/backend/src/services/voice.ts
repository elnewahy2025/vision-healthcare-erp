import { getEnv } from '@healthcare/shared/config';
import { db } from '../core/database.js';

interface VoiceCallOptions {
  tenantId: string;
  fromNumber: string;
  toNumber: string;
  callerId?: string;
  twiml?: string;
  voiceUrl?: string;
  callType?: 'outbound' | 'inbound';
  notes?: string;
  patientId?: string;
  appointmentId?: string;
}

interface ConferenceOptions {
  tenantId: string;
  roomName: string;
  participants: Array<{ phone: string; name?: string; role: 'doctor' | 'patient' | 'staff' }>;
  callType: 'conference' | 'one-on-one';
  appointmentId?: string;
}

let twilioClient: any = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const env = getEnv();
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      return twilioClient;
    } catch { /* not installed */ }
  }
  return null;
}

export async function makeVoiceCall(options: VoiceCallOptions): Promise<{
  success: boolean;
  callSid?: string;
  error?: string;
}> {
  try {
    const client = getTwilioClient();
    const env = getEnv();

    if (!client) {
      console.log('[VOICE DEV] Outbound call:', { to: options.toNumber, from: options.fromNumber });
      // Simulate a call
      await db('voice_calls').insert({
        tenant_id: options.tenantId,
        patient_id: options.patientId || null,
        appointment_id: options.appointmentId || null,
        call_type: 'outbound',
        from_number: options.fromNumber,
        to_number: options.toNumber,
        status: 'completed',
        duration_seconds: Math.floor(Math.random() * 300),
        notes: options.notes || null,
        external_call_sid: `dev_${Date.now()}`,
      });
      return { success: true, callSid: `dev_${Date.now()}` };
    }

    const call = await client.calls.create({
      to: options.toNumber,
      from: options.fromNumber,
      twiml: options.twiml || `<Response><Say>This is a call from Vision Healthcare.</Say></Response>`,
      url: options.voiceUrl || undefined,
      statusCallback: `${env.APP_URL}/api/v1/advanced-communication/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    });

    await db('voice_calls').insert({
      tenant_id: options.tenantId,
      patient_id: options.patientId || null,
      appointment_id: options.appointmentId || null,
      call_type: 'outbound',
      from_number: options.fromNumber,
      to_number: options.toNumber,
      status: call.status || 'initiated',
      notes: options.notes || null,
      external_call_sid: call.sid,
    });

    return { success: true, callSid: call.sid };
  } catch (error: any) {
    console.error('✗ Voice call failed:', error.message);
    await db('voice_calls').insert({
      tenant_id: options.tenantId,
      patient_id: options.patientId || null,
      appointment_id: options.appointmentId || null,
      call_type: 'outbound',
      from_number: options.fromNumber,
      to_number: options.toNumber,
      status: 'failed',
      error_message: error.message,
      notes: options.notes || null,
    }).catch(() => {});
    return { success: false, error: error.message };
  }
}

export async function createConferenceCall(options: ConferenceOptions): Promise<{
  success: boolean;
  roomSid?: string;
  error?: string;
}> {
  try {
    const client = getTwilioClient();
    const env = getEnv();

    if (!client) {
      console.log('[VOICE DEV] Conference:', { room: options.roomName, participants: options.participants.length });
      await db('voice_calls').insert({
        tenant_id: options.tenantId,
        appointment_id: options.appointmentId || null,
        call_type: 'conference',
        to_number: options.participants.map(p => p.phone).join(','),
        status: 'completed',
        duration_seconds: Math.floor(Math.random() * 600),
        external_call_sid: `conf_dev_${Date.now()}`,
      });
      return { success: true, roomSid: `conf_dev_${Date.now()}` };
    }

    const roomName = options.roomName || `room_${Date.now()}`;

    // Dial each participant into the conference room
    for (const participant of options.participants) {
      await client.calls.create({
        to: participant.phone,
        from: env.TWILIO_PHONE_NUMBER,
        twiml: `<Response><Dial><Conference statusCallback="${env.APP_URL}/api/v1/advanced-communication/voice/conf-status" statusCallbackEvent="start end join leave">${roomName}</Conference></Dial></Response>`,
        statusCallback: `${env.APP_URL}/api/v1/advanced-communication/voice/status`,
      });
    }

    await db('voice_calls').insert({
      tenant_id: options.tenantId,
      appointment_id: options.appointmentId || null,
      call_type: 'conference',
      from_number: env.TWILIO_PHONE_NUMBER,
      to_number: options.participants.map(p => p.phone).join(','),
      status: 'initiated',
      external_call_sid: roomName,
    });

    return { success: true, roomSid: roomName };
  } catch (error: any) {
    console.error('✗ Conference call failed:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getVoiceStats(tenantId: string): Promise<any> {
  const total = await db('voice_calls').where({ tenant_id: tenantId }).count('id as count').first();
  const byStatus = await db('voice_calls').where({ tenant_id: tenantId })
    .select('status').count('id as count').groupBy('status');
  const byType = await db('voice_calls').where({ tenant_id: tenantId })
    .select('call_type').count('id as count').groupBy('call_type');
  const totalMinutes = await db('voice_calls')
    .where({ tenant_id: tenantId })
    .sum('duration_seconds as total_seconds').first();
  const today = await db('voice_calls')
    .where({ tenant_id: tenantId })
    .whereRaw("created_at >= CURRENT_DATE")
    .count('id as count').first();

  return {
    total: Number(total?.count || 0),
    today: Number(today?.count || 0),
    totalMinutes: Math.round(Number((totalMinutes as any)?.total_seconds || 0) / 60),
    byStatus,
    byType,
  };
}

export async function updateCallStatus(
  callSid: string,
  status: string,
  durationSeconds?: number
): Promise<void> {
  await db('voice_calls')
    .where({ external_call_sid: callSid })
    .update({
      status,
      duration_seconds: durationSeconds || undefined,
      completed_at: ['completed', 'failed', 'busy', 'no-answer'].includes(status)
        ? db.fn.now()
        : undefined,
    });
}

export async function getVoiceCalls(
  tenantId: string,
  filters: { status?: string; callType?: string; page: number; limit: number }
): Promise<{ data: any[]; total: number }> {
  let query = db('voice_calls').where({ tenant_id: tenantId });

  if (filters.status) {
    query = query.andWhere({ status: filters.status });
  }
  if (filters.callType) {
    query = query.andWhere({ call_type: filters.callType });
  }

  const totalQuery = query.clone();
  const total = await totalQuery.count('id as count').first();

  const data = await query
    .orderBy('created_at', 'desc')
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);

  return { data, total: Number(total?.count || 0) };
}
