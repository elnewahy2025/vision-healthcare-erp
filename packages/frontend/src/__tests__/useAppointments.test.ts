import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAppointmentList, useTodayAppointments } from '../hooks/useAppointments';
import { appointmentsApi } from '../lib/api/appointments';

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
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useAppointmentList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches appointment list', async () => {
    const mockData = { data: [{ id: '1', status: 'scheduled' }], pagination: { total: 1 } };
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
