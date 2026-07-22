export const queryKeys = {
  patients: {
    all: ['patients'] as const,
    list: (params?: Record<string, unknown>) => ['patients', 'list', params] as const,
    detail: (id: string) => ['patients', 'detail', id] as const,
    search: (q: string) => ['patients', 'search', q] as const,
  },
  appointments: {
    all: ['appointments'] as const,
    list: (params?: Record<string, unknown>) => ['appointments', 'list', params] as const,
    detail: (id: string) => ['appointments', 'detail', id] as const,
    today: ['appointments', 'today'] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
} as const;
