import { describe, it, expect } from 'vitest';

describe('Laboratory Module', () => {
  it('should validate lab result against reference range', () => {
    const results = [
      { test: 'Hemoglobin', value: 14.5, min: 13.5, max: 17.5, unit: 'g/dL' },
      { test: 'Glucose', value: 110, min: 70, max: 100, unit: 'mg/dL' },
      { test: 'WBC', value: 7.2, min: 4.5, max: 11.0, unit: 'K/uL' },
    ];
    const abnormal = results.filter((r) => r.value < r.min || r.value > r.max);
    expect(abnormal).toHaveLength(1);
    expect(abnormal[0].test).toBe('Glucose');
    expect(abnormal[0].value).toBeGreaterThan(abnormal[0].max);
  });

  it('should categorize results by severity', () => {
    const classify = (value: number, min: number, max: number): string => {
      if (value < min * 0.5 || value > max * 1.5) return 'critical';
      if (value < min || value > max) return 'abnormal';
      return 'normal';
    };
    expect(classify(15, 13, 17)).toBe('normal');
    expect(classify(12, 13, 17)).toBe('abnormal');
    expect(classify(30, 13, 17)).toBe('critical');
  });

  it('should validate sample collection metadata', () => {
    const sample = {
      collectedAt: new Date('2026-07-22T08:00:00Z'),
      processedAt: new Date('2026-07-22T09:30:00Z'),
      specimenType: 'blood',
      volume: 5,
      minVolume: 2,
    };
    const isValid = sample.volume >= sample.minVolume &&
      sample.processedAt > sample.collectedAt &&
      ['blood', 'urine', 'saliva', 'tissue'].includes(sample.specimenType);
    expect(isValid).toBe(true);
  });

  it('should calculate turnaround time', () => {
    const collectedAt = new Date('2026-07-22T08:00:00Z');
    const reportedAt = new Date('2026-07-22T14:00:00Z');
    const turnaroundHours = (reportedAt.getTime() - collectedAt.getTime()) / (1000 * 60 * 60);
    expect(turnaroundHours).toBe(6);
  });
});
