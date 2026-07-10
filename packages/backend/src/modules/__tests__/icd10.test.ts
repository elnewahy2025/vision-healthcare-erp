import { describe, it, expect } from 'vitest';

const SAMPLE_CODES = [
  { code: 'E11', description: 'Type 2 diabetes mellitus', isChronic: true },
  { code: 'I10', description: 'Essential hypertension', isChronic: true },
  { code: 'J06', description: 'Acute upper respiratory infection', isChronic: false },
  { code: 'N39', description: 'Urinary tract infection', isChronic: false },
  { code: 'R51', description: 'Headache', isChronic: false },
  { code: 'Z23', description: 'Need for immunization', isChronic: false },
  { code: 'U07.1', description: 'COVID-19, virus identified', isChronic: false },
  { code: 'M54', description: 'Dorsalgia (back pain)', isChronic: true },
  { code: 'F32', description: 'Major depressive disorder', isChronic: true },
  { code: 'E66', description: 'Obesity', isChronic: true },
];

describe('ICD-10 Code Database', () => {
  it('should have valid code format for all entries', () => {
    // ICD-10 codes: letter + 2 digits (optional decimal + digit)
    const codeRegex = /^[A-Z][0-9]{2}(\.[0-9])?$/;
    for (const entry of SAMPLE_CODES) {
      expect(entry.code).toMatch(codeRegex);
    }
  });

  it('should have descriptions for all codes', () => {
    for (const entry of SAMPLE_CODES) {
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('should find code by prefix search', () => {
    const searchPrefix = 'E';
    const results = SAMPLE_CODES.filter(c => c.code.startsWith(searchPrefix));
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.code.startsWith('E'))).toBe(true);
  });

  it('should filter chronic conditions', () => {
    const chronic = SAMPLE_CODES.filter(c => c.isChronic);
    const acute = SAMPLE_CODES.filter(c => !c.isChronic);
    expect(chronic.length).toBeGreaterThan(0);
    expect(acute.length).toBeGreaterThan(0);
  });
});
