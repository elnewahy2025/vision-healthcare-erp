import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePatientList, usePatient, usePatientSearch } from '../hooks/usePatients';
import { patientsApi } from '../lib/api/patients';

vi.mock('../lib/api/patients', () => ({
  patientsApi: {
    list: vi.fn(),
    get: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePatientList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches patient list', async () => {
    const mockData = { data: [{ id: '1', firstName: 'John' }], pagination: { total: 1 } };
    vi.mocked(patientsApi.list).mockResolvedValue(mockData);

    const { result } = renderHook(() => usePatientList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
    expect(patientsApi.list).toHaveBeenCalled();
  });
});

describe('usePatient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches a single patient by id', async () => {
    const mockPatient = { id: '1', firstName: 'John', lastName: 'Doe' };
    vi.mocked(patientsApi.get).mockResolvedValue(mockPatient);

    const { result } = renderHook(() => usePatient('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPatient);
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => usePatient(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(patientsApi.get).not.toHaveBeenCalled();
  });
});

describe('usePatientSearch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not search when query is less than 2 characters', () => {
    const { result } = renderHook(() => usePatientSearch('a'), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(patientsApi.search).not.toHaveBeenCalled();
  });

  it('searches when query is 2+ characters', async () => {
    vi.mocked(patientsApi.search).mockResolvedValue([{ id: '1', name: 'John' }]);

    const { result } = renderHook(() => usePatientSearch('Jo'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patientsApi.search).toHaveBeenCalledWith('Jo');
  });
});
