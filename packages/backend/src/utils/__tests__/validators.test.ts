import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone, isValidIcd10Code, isStrongPassword } from '@healthcare/shared/utils';

describe('Validators', () => {
  it('validates emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('not-email')).toBe(false);
    expect(isValidEmail('user@domain.co.uk')).toBe(true);
    expect(isValidEmail('')).toBe(false);
  });

  it('validates phones (including Egyptian format)', () => {
    expect(isValidPhone('+966501234567')).toBe(true);  // Saudi
    expect(isValidPhone('+201001234567')).toBe(true);   // Egypt
    expect(isValidPhone('01001234567')).toBe(true);     // Egypt local
    expect(isValidPhone('00201001234567')).toBe(true);  // Egypt with 00
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });

  it('validates ICD-10 codes', () => {
    expect(isValidIcd10Code('G43.9')).toBe(true);
    expect(isValidIcd10Code('E11.9')).toBe(true);
    expect(isValidIcd10Code('I10')).toBe(true);
    expect(isValidIcd10Code('Z23')).toBe(true);
    expect(isValidIcd10Code('U07.1')).toBe(true);
    expect(isValidIcd10Code('ABC')).toBe(false);
    expect(isValidIcd10Code('')).toBe(false);
  });

  it('checks password strength', () => {
    expect(isStrongPassword('Weak1').valid).toBe(false);
    expect(isStrongPassword('StrongP@ss1').valid).toBe(true);
    expect(isStrongPassword('noNumber!').valid).toBe(false);
    expect(isStrongPassword('12345678').valid).toBe(false);
    expect(isStrongPassword('Aa1@strong').valid).toBe(true);
  });
});
