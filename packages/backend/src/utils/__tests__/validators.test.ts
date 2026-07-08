import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone, isValidIcd10Code, isStrongPassword } from '@healthcare/shared/utils';

describe('Validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('not-email')).toBe(false);
  });
  it('validates phones', () => {
    expect(isValidPhone('+966501234567')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
  it('validates ICD-10 codes', () => {
    expect(isValidIcd10Code('G43.9')).toBe(true);
    expect(isValidIcd10Code('ABC')).toBe(false);
  });
  it('checks password strength', () => {
    expect(isStrongPassword('Weak1').valid).toBe(false);
    expect(isStrongPassword('StrongP@ss1').valid).toBe(true);
  });
});
