import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAppointmentList, useTodayAppointments } from '../hooks/useAppointments';
import { appointmentsApi } from '../lib/api/appointments';
import type { Appointment } from '../types/appointment';

vi.mock('../lib/api/appointments', () => ({
  appointmentsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    checkIn: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    today: vi.fn(),
    getSlots: vi.fn(),
    bulkCreate: vi.fn(),
    bulkCancel: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'apt-001',
    tenantId: 'tenant-001',
    patientId: 'patient-001',
    doctorId: 'doctor-001',
    branchId: 'branch-001',
    appointmentDate: '2026-07-25',
    startTime: '10:00',
    endTime: '10:30',
    duration: 30,
    type: 'consultation',
    status: 'scheduled',
    reason: 'Check-up',
    notes: null,
    isWalkIn: false,
    isVirtual: false,
    telemedicineLink: null,
    reminderSent: false,
    checkInTime: null,
    checkOutTime: null,
    cancelledAt: null,
    cancelReason: null,
    rescheduledFrom: null,
    timezone: 'Africa/Cairo',
    patientName: 'John Doe',
    patientMrn: 'MRN-001',
    createdAt: '2026-07-23T10:00:00Z',
    updatedAt: '2026-07-23T10:00:00Z',
    ...overrides,
  };
}

describe('useAppointmentList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches appointment list', async () => {
    const mockData = {
      data: [makeAppointment()],
      pagination: { total: 1, totalPages: 1, page: 1, limit: 10 },
    };
    vi.mocked(appointmentsApi.list).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAppointmentList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});

describe('useTodayAppointments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches today summary', async () => {
    const mockData = { counts: { total: 5, scheduled: 3 }, appointments: [] };
    vi.mocked(appointmentsApi.today).mockResolvedValue(mockData);

    const { result } = renderHook(() => useTodayAppointments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
