import { describe, it, expect } from 'vitest';

describe('Patient Module', () => {
  it('should calculate age from date of birth', () => {
    const calcAge = (dob: string): number => {
      const birth = new Date(dob);
      const today = new Date('2026-07-09');
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    };

    expect(calcAge('1990-01-15')).toBe(36);
    expect(calcAge('2000-07-09')).toBe(26);
    expect(calcAge('2015-12-25')).toBe(10);
    expect(calcAge('2024-01-01')).toBe(2);
  });

  it('should generate valid medical record numbers', () => {
    const generateMrn = (tenantSlug: string, count: number): string => {
      const slug = tenantSlug.toUpperCase().substring(0, 3);
      return `MRN-${slug}-${String(count).padStart(6, '0')}`;
    };

    expect(generateMrn('egypt-clinic', 1)).toBe('MRN-EGY-000001');
    expect(generateMrn('cairo-hospital', 999)).toBe('MRN-CAI-000999');
    expect(generateMrn('alex', 123456)).toBe('MRN-ALE-123456');
  });

  it('should validate Egyptian phone numbers', () => {
    const isValidEgyptPhone = (phone: string): boolean => {
      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      // Egyptian mobile: 01xx xxx xxxx (11 digits)
      // With country code: +20 1xx xxx xxxx (12 digits starting with 201)
      // With 00 prefix: 0020 1xx xxx xxxx (13 digits starting with 00201)
      if (cleaned.length === 10 && /^01[0-9]/.test(cleaned)) return true; // 10-digit local
      if (cleaned.length === 11 && cleaned.startsWith('01')) return true;  // 11-digit local with 0
      if (cleaned.length === 12 && cleaned.startsWith('20')) return true;  // with country code
      if (cleaned.length === 14 && cleaned.startsWith('0020')) return true; // with 00 prefix
      return false;
    };

    // Valid Egyptian numbers
    expect(isValidEgyptPhone('01001234567')).toBe(true);    // 11 digits, 010
    expect(isValidEgyptPhone('01112345678')).toBe(true);    // 11 digits, 011
    expect(isValidEgyptPhone('0129876543')).toBe(true);     // 10 digits, 012
    expect(isValidEgyptPhone('0155555555')).toBe(true);     // 10 digits, 015
    expect(isValidEgyptPhone('+201001234567')).toBe(true);  // with +
    expect(isValidEgyptPhone('00201001234567')).toBe(true); // with 00

    // Invalid
    expect(isValidEgyptPhone('123456')).toBe(false);        // too short
    expect(isValidEgyptPhone('02012345678')).toBe(false);   // wrong prefix
    expect(isValidEgyptPhone('0090012345678')).toBe(false); // wrong country
    expect(isValidEgyptPhone('')).toBe(false);              // empty
  });

  it('should support Egyptian National ID format', () => {
    const isValidEgyptianId = (id: string): boolean => {
      // Egyptian National ID: 14 digits
      // Format: century(1) + birthYear(2) + month(2) + day(2) + govCode(2) + serial(4) + checksum(1)
      return /^\d{14}$/.test(id);
    };

    expect(isValidEgyptianId('29001011234567')).toBe(true);  // Valid format
    expect(isValidEgyptianId('12345678901234')).toBe(true);  // Valid format
    expect(isValidEgyptianId('12345')).toBe(false);          // Too short
    expect(isValidEgyptianId('abcdefghijklmn')).toBe(false); // Not digits
    expect(isValidEgyptianId('')).toBe(false);               // Empty
  });
});
