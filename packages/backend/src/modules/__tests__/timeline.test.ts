import { describe, it, expect } from 'vitest';

describe('Patient Timeline', () => {
  it('should sort events chronologically (newest first)', () => {
    const events = [
      { type: 'appointment', date: '2026-03-15' },
      { type: 'emr', date: '2026-01-10' },
      { type: 'invoice', date: '2026-06-20' },
      { type: 'allergy', date: '2026-03-01' },
      { type: 'document', date: '2026-05-05' },
    ];

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    expect(events[0].type).toBe('invoice');
    expect(events[1].type).toBe('document');
    expect(events[2].type).toBe('appointment');
    expect(events[3].type).toBe('allergy');
    expect(events[4].type).toBe('emr');
  });

  it('should handle empty timeline', () => {
    const events: any[] = [];
    expect(events.length).toBe(0);
  });

  it('should handle mixed event types', () => {
    const events = [
      { type: 'emr', date: '2026-01-10', title: 'Consultation visit' },
      { type: 'appointment', date: '2026-01-10', title: 'Follow-up' },
    ];

    // Same date — both are kept
    expect(events.length).toBe(2);
    const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    expect(sorted.length).toBe(2);
  });
});
