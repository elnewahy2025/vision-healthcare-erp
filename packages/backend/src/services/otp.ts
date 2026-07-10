import { db } from '../core/database.js';
import { sendSms } from './sms.js';
import { getEnv } from '@healthcare/shared/config';

function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createAndSendOtp(
  tenantId: string,
  identifier: string,
  purpose: 'login' | 'verify_email' | 'verify_phone' | 'password_reset',
): Promise<boolean> {
  // Delete any existing unused OTPs for this identifier+purpose
  await db('otp_codes')
    .where({ identifier, purpose, verified_at: null })
    .where('expires_at', '<', new Date())
    .delete();

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db('otp_codes').insert({
    tenant_id: tenantId,
    identifier,
    code,
    purpose,
    expires_at: expiresAt,
  });

  // Send via SMS if identifier is a phone number, else log
  if (identifier.includes('@')) {
    console.log(`[OTP] Email ${identifier}: code=${code}`);
    return true;
  } else {
    return sendSms({ to: identifier, message: `Your verification code is: ${code}. It expires in 5 minutes.` });
  }
}

export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: string,
): Promise<boolean> {
  const otp = await db('otp_codes')
    .where({ identifier, code, purpose, verified_at: null })
    .where('expires_at', '>', new Date())
    .orderBy('created_at', 'desc')
    .first();

  if (!otp) return false;

  // Check attempts
  if (otp.attempts >= 5) {
    await db('otp_codes').where({ id: otp.id }).update({ verified_at: new Date(0) }); // permanently invalidate
    return false;
  }

  // Mark as verified
  await db('otp_codes').where({ id: otp.id }).update({ verified_at: new Date() });
  return true;
}

export async function incrementOtpAttempt(identifier: string, code: string, purpose: string): Promise<void> {
  await db('otp_codes')
    .where({ identifier, code, purpose, verified_at: null })
    .increment('attempts', 1);
}
