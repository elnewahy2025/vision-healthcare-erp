import { describe, it, expect } from 'vitest';
import { formatCurrency, calculateBMI } from '@healthcare/shared/utils';

describe('Formatters', () => {
  it('formats currency', () => {
    const r = formatCurrency(517.5, 'SAR', 'en');
    expect(r).toContain('517.50');
  });
  it('calculates BMI', () => {
    expect(calculateBMI(70, 175)).toBe(22.9);
    expect(calculateBMI(100, 180)).toBe(30.9);
  });
});
