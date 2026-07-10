import { getEnv } from '@healthcare/shared/config';

interface SmsOptions {
  to: string;
  message: string;
}

export async function sendSms(options: SmsOptions): Promise<boolean> {
  const env = getEnv();

  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
      await client.messages.create({ body: options.message, from: env.TWILIO_PHONE_NUMBER, to: options.to });
      return true;
    } catch (error: any) {
      console.error('✗ SMS send failed:', error.message);
      return false;
    }
  }

  console.log('[SMS DEV]', options);
  return true;
}
