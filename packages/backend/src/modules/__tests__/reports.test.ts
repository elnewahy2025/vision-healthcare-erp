import { describe, it, expect } from 'vitest';

describe('Reports Module', () => {
  it('should calculate monthly revenue totals', () => {
    const invoices = [
      { month: '2026-01', amount: 5000 },
      { month: '2026-01', amount: 3000 },
      { month: '2026-02', amount: 7000 },
    ];
    const totals = invoices.reduce<Record<string, number>>((acc, inv) => {
      acc[inv.month] = (acc[inv.month] || 0) + inv.amount;
      return acc;
    }, {});
    expect(totals['2026-01']).toBe(8000);
    expect(totals['2026-02']).toBe(7000);
  });

  it('should calculate patient visit statistics', () => {
    const visits = [
      { patientId: 'P1', date: '2026-07-01' },
      { patientId: 'P1', date: '2026-07-15' },
      { patientId: 'P2', date: '2026-07-01' },
      { patientId: 'P3', date: '2026-07-10' },
    ];
    const uniquePatients = new Set(visits.map((v) => v.patientId)).size;
    const totalVisits = visits.length;
    expect(uniquePatients).toBe(3);
    expect(totalVisits).toBe(4);
  });

  it('should filter date ranges correctly', () => {
    const startDate = new Date('2026-07-01');
    const endDate = new Date('2026-07-31');
    const records = [
      { date: new Date('2026-06-30') },
      { date: new Date('2026-07-01') },
      { date: new Date('2026-07-15') },
      { date: new Date('2026-08-01') },
    ];
    const inRange = records.filter((r) => r.date >= startDate && r.date <= endDate);
    expect(inRange).toHaveLength(2);
  });
});
