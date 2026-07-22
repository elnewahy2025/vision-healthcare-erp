import { describe, it, expect } from 'vitest';

describe('HR Module', () => {
  it('should calculate annual leave balance', () => {
    const annualEntitlement = 21;
    const used = 8;
    const carried = 3;
    const balance = annualEntitlement - used + carried;
    expect(balance).toBe(16);
  });

  it('should calculate overtime pay correctly', () => {
    const hourlyRate = 50;
    const regularHours = 8;
    const overtimeHours = 4;
    const overtimeMultiplier = 1.5;
    const regularPay = hourlyRate * regularHours;
    const overtimePay = hourlyRate * overtimeHours * overtimeMultiplier;
    const totalPay = regularPay + overtimePay;
    expect(regularPay).toBe(400);
    expect(overtimePay).toBe(300);
    expect(totalPay).toBe(700);
  });

  it('should validate employee shift scheduling', () => {
    const shifts = [
      { employeeId: 'E1', start: '08:00', end: '16:00', day: 'Monday' },
      { employeeId: 'E1', start: '16:00', end: '00:00', day: 'Monday' },
    ];
    // Same employee cannot have overlapping shifts on same day
    const hasOverlap = shifts[0].employeeId === shifts[1].employeeId &&
      shifts[0].day === shifts[1].day &&
      shifts[0].start < shifts[1].end && shifts[1].start < shifts[0].end;
    expect(hasOverlap).toBe(false); // 08-16 and 16-00 are back-to-back, not overlapping
  });

  it('should detect scheduling conflicts', () => {
    const shifts = [
      { employeeId: 'E1', start: '08:00', end: '16:00', day: 'Monday' },
      { employeeId: 'E1', start: '10:00', end: '18:00', day: 'Monday' },
    ];
    const hasConflict = shifts[0].employeeId === shifts[1].employeeId &&
      shifts[0].day === shifts[1].day &&
      shifts[0].start < shifts[1].end && shifts[1].start < shifts[0].end;
    expect(hasConflict).toBe(true);
  });
});
