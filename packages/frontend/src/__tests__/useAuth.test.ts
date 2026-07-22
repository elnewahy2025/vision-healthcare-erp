import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCurrentUser } from '../hooks/useAuth';
import { authApi } from '../lib/api/auth';

vi.mock('../lib/api/auth', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    refresh: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCurrentUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches current user', async () => {
    const mockUser = { id: '1', email: 'admin@test.com', roles: ['super_admin'] };
    vi.mocked(authApi.me).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
    expect(authApi.me).toHaveBeenCalled();
  });

  it('handles auth failure', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useCurrentUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Unauthorized');
  });
});
