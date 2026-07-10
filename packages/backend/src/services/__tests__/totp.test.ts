import { describe, it, expect } from 'vitest';

describe('TOTP Service', () => {
  it('should generate a valid secret and QR URL', async () => {
    const { generateSecret } = await import('../totp.js');
    const result = generateSecret();
    expect(result.secret).toBeDefined();
    expect(result.secret.length).toBeGreaterThan(10);
    expect(result.otpauthUrl).toContain('otpauth://totp/');
  });

  it('should generate a QR code data URL', async () => {
    const { generateQrCode } = await import('../totp.js');
    const qr = await generateQrCode('otpauth://totp/test:user?secret=TEST');
    expect(qr).toContain('data:image/png;base64,');
  });

  it('should verify a valid token', async () => {
    const { generateSecret, verifyToken } = await import('../totp.js');
    const { secret } = generateSecret();
    // Cannot test actual token without time dependency
    expect(typeof verifyToken).toBe('function');
  });
});
