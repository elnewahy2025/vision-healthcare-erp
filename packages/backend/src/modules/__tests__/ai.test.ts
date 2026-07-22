import { describe, it, expect } from 'vitest';

describe('AI Module', () => {
  it('should calculate confidence score correctly', () => {
    const predictions = [
      { label: 'flu', probability: 0.85 },
      { label: 'cold', probability: 0.10 },
      { label: 'allergy', probability: 0.05 },
    ];
    const topPrediction = predictions.reduce((a, b) => (a.probability > b.probability ? a : b));
    expect(topPrediction.label).toBe('flu');
    expect(topPrediction.probability).toBeGreaterThanOrEqual(0.5);
  });

  it('should filter predictions below threshold', () => {
    const threshold = 0.3;
    const predictions = [
      { label: 'condition_a', score: 0.8 },
      { label: 'condition_b', score: 0.2 },
      { label: 'condition_c', score: 0.5 },
    ];
    const filtered = predictions.filter((p) => p.score >= threshold);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((p) => p.label)).toEqual(['condition_a', 'condition_c']);
  });

  it('should normalize risk scores to 0-100 range', () => {
    const normalize = (value: number, min: number, max: number): number => {
      return Math.round(((value - min) / (max - min)) * 100);
    };
    expect(normalize(5, 0, 10)).toBe(50);
    expect(normalize(0, 0, 10)).toBe(0);
    expect(normalize(10, 0, 10)).toBe(100);
    expect(normalize(7, 3, 9)).toBe(67); // (7-3)/(9-3)*100 = 66.67 -> 67
  });
});
